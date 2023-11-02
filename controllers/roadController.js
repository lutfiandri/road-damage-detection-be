import Road from '../models/road.js';
import csv from 'fast-csv';
import axios from 'axios';
import getenv from '../utils/helpers/getenv.js';

const BE_ML_BASEURL = getenv('BE_ML_BASEURL');

console.log(BE_ML_BASEURL);

export const createRoad = async (req, res) => {
  try {
    const { title, locations, videoUrl } = req?.body;

    const newRoad = new Road({
      title,
      locations,
      videoUrl,
    });

    const result = await newRoad.save();

    // inference when creating
    (async function () {
      const startedAt = new Date();
      try {
        const update1Result = await Road.findByIdAndUpdate(result.id, {
          detectionMeta: {
            startedAt: startedAt,
            status: 'processing',
          },
        });
        const mlResult = await axios.post(BE_ML_BASEURL + '/api/predict', {
          url: videoUrl,
          prediction_fps: 1,
        });
        let totalDamage = 0;

        const detections = mlResult.data.result?.map((r) => {
          totalDamage += r?.prediction?.length ? r?.prediction?.length : 0;

          return {
            ...r,
            predictions: r?.prediction,
          };
        });

        const detectionMeta = {
          startedAt: startedAt,
          endedAt: new Date(),
          status: 'done',
          totalDamage: totalDamage,
        };

        await Road.findByIdAndUpdate(result.id, {
          detectionMeta,
          detections,
        });

        const roadDetectionResult = await Road.findById(result.id);

        await syncLocationDetection(roadDetectionResult);

        console.log('inference success');
      } catch (error) {
        const detectionMeta = {
          startedAt: startedAt,
          endedAt: new Date(),
          status: 'error',
          errorMessage: error.message,
        };

        await Road.findByIdAndUpdate(result.id, {
          detectionMeta,
        });

        console.error('error on inference', error.message);
      }
    })();

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoads = async (req, res) => {
  try {
    const projection = { locations: 0, detections: 0 };
    if (req.query?.withLocations == 1) {
      delete projection.locations;
    }
    if (req.query?.withDetections == 1) {
      delete projection.detections;
    }

    const result = await Road.find({}, projection).sort({
      createdAt: -1,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoad = async (req, res) => {
  try {
    const { id } = req?.params;
    const result = await Road.findById(id);

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: `road ${id} not found` });
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRoad = async (req, res) => {
  try {
    const { title, locations } = req?.body;
    const { id } = req?.params;

    const result = await Road.findByIdAndUpdate(id, {
      title,
      locations,
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: `road ${id} not found` });
    }

    // after success
    if (title) {
      result.title = title;
    }
    if (locations) {
      result.locations = locations;
    }

    const syncLocationResult = await syncLocationDetection(result);

    return res.json({ success: true, data: syncLocationResult });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLocationsCsv = async (req, res) => {
  try {
    const { id } = req?.params;

    const csvFile = req?.files?.csv;
    const locations = [];

    let i = 0;

    csv
      .parseString(csvFile.data.toString(), {})
      .on('error', (error) => console.log(error))
      .on('data', (row) => {
        if (i++ == 0) {
          if (
            row[0] !== 'microTime' ||
            row[1] !== 'latitude' ||
            row[2] !== 'longitude'
          ) {
            return res.status(400).json({
              success: false,
              message: `csv format should be: microTime,latitude,longitude`,
            });
          }
          return;
        }
        locations.push({
          microTime: Number(row[0]),
          latitude: Number(row[1]),
          longitude: Number(row[2]),
        });
      })
      .on('end', async () => {
        const result = await Road.findByIdAndUpdate(id, {
          locations,
        }).catch((error) =>
          res.status(500).json({ success: false, message: error.message })
        );

        result.locations = locations;

        const syncLocationResult = await syncLocationDetection(result);

        if (!result) {
          return res
            .status(404)
            .json({ success: false, message: `road ${id} not found` });
        }

        return res.json({ success: true, data: syncLocationResult });
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteRoad = async (req, res) => {
  try {
    const { id } = req?.params;

    const result = await Road.findByIdAndDelete(id);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// download csv
export const downloadRoadsCsv = async (req, res) => {
  try {
    const projection = { locations: 0 };
    const roads = await Road.find({}, projection).sort({
      createdAt: -1,
    });

    const header = [
      'No',
      'Waktu Unggah',
      'Judul',
      'Link Video',
      'Jumlah Pothole',
      'Jumlah Alligator Crack',
      'Jumlah Lateral Crack',
      'Jumlah Longitudinal Crack',
      'Total Kerusakan',
    ];

    const rows = roads.map((road, i) => {
      const predictions = road?.detections?.reduce(
        (acc, cur) => [...acc, ...cur.predictions],
        []
      );

      const potholes = predictions.filter(
        (prediction) => prediction.classId == 0
      );
      const alligatorCracks = predictions.filter(
        (prediction) => prediction.classId == 1
      );
      const lateralCracks = predictions.filter(
        (prediction) => prediction.classId == 2
      );
      const longitudinalCracks = predictions.filter(
        (prediction) => prediction.classId == 3
      );

      return [
        i + 1,
        road?.createdAt?.toISOString(),
        road?.title,
        road?.videoUrl,
        potholes.length,
        alligatorCracks.length,
        lateralCracks.length,
        longitudinalCracks.length,
        road?.detectionMeta?.totalDamage,
      ];
    });

    const csvArray = [header, ...rows];
    const csv = csvArray.map((row) => row.join(',')).join('\n');

    return res.attachment('RDD - Kerusakan Jalan.csv').send(csv);

    // return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadRoadCsv = async (req, res) => {
  try {
    const { id } = req?.params;
    const road = await Road.findById(id);

    if (!road) {
      return res
        .status(404)
        .json({ success: false, message: `road ${id} not found` });
    }

    const header = [
      'No',
      'Frame',
      'Waktu Detik',
      'Latitude',
      'Longitude',
      'Jenis Kerusakan',
    ];

    const predictions = road?.detections?.reduce((acc, cur) => {
      const newPredictions = cur.predictions?.map((p) => ({
        ...p._doc,
        frame: cur.frame,
        time: cur.time,
        location: cur.location,
      }));
      console.log('new predictions', newPredictions);
      return [...acc, ...newPredictions];
    }, []);

    console.log(predictions);

    const rows = predictions?.map((prediction, i) => {
      return [
        i + 1,
        prediction?.frame,
        prediction?.time,
        prediction?.location?.latitude,
        prediction?.location?.longitude,
        prediction?.class,
      ];
    });

    const csvArray = [header, ...rows];
    const csv = csvArray.map((row) => row.join(',')).join('\n');

    return res.attachment(`RDD - ${road.title}.csv`).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// utils function
const syncLocationDetection = async (road) => {
  if (!road?.detections?.length || !road?.locations?.length) {
    console.log('not sync locations');
    return road;
  }

  console.log(
    'sync locations',
    road?.detections?.length,
    road?.locations?.length
  );

  const times = road.detections.map((detection) => detection.time);
  const locationBody = {
    locations: road?.locations,
    times: times,
  };
  const locationResult = await axios.post(
    BE_ML_BASEURL + '/api/location/synchronize',
    locationBody
  );

  const locationData = locationResult?.data?.locations;

  const newDetections = road.detections.map((detection, i) => {
    return {
      ...detection,
      location: {
        latitude: locationData[i].latitude,
        longitude: locationData[i].longitude,
      },
    };
  });

  await Road.findByIdAndUpdate(road.id, {
    detections: newDetections,
  }).catch((error) =>
    res.status(500).json({ success: false, message: error.message })
  );

  road.detections = newDetections;

  console.log(road);

  return road;
};

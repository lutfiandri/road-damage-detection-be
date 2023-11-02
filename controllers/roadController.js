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
      try {
        const startedAt = new Date();
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
          totalDamage += r?.prediction?.length;

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

        const roadDetectionResult = await Road.findByIdAndUpdate(result.id, {
          detectionMeta,
          detections,
        });

        roadDetectionResult.detectionMeta = detectionMeta;
        roadDetectionResult.detections = detections;

        await syncLocationDetection(roadDetectionResult);

        console.log('inference success');
      } catch (error) {
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

// utils function
const syncLocationDetection = async (road) => {
  if (!road.detections || !road?.locations) {
    return road;
  }

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

  // const newDetections = road.detections.map((detection, i) => {
  //   return {
  //     ...detection,
  //     location: {
  //       latitude: locationData[i].latitude,
  //       longitude: locationData[i].longitude,
  //     },
  //   };
  // });

  const newDetections = road.detections.map((detection, i) => {
    const newDetection = detection;
    newDetection.location = {
      latitude: locationData[i].latitude,
      longitude: locationData[i].longitude,
    };
    return newDetection;
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

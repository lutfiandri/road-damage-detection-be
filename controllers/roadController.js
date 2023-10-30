import Road from '../models/road';
import csv from 'fast-csv';

export const createRoad = async (req, res) => {
  try {
    const { title, locations, videoUrl } = req?.body;

    const newRoad = new Road({
      title,
      locations,
      videoUrl,
    });

    const result = await newRoad.save();

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoads = async (req, res) => {
  try {
    const result = await Road.find({}, { locations: 0, detections: 0 });

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
    result.title = title;

    return res.json({ success: true, data: result });
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

        if (!result) {
          return res
            .status(404)
            .json({ success: false, message: `road ${id} not found` });
        }

        return res.json({ success: true, data: result });
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

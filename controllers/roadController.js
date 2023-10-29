import Road from '../models/road';

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
    const result = await Road.find();

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoad = async (req, res) => {
  try {
    const result = await Road.findById(req?.body?.id);

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRoad = async (req, res) => {
  try {
    const { title } = req?.body;
    const { id } = req?.params;

    const result = await Road.findByIdAndUpdate(id, {
      title,
    });

    return res.json({ success: true, data: result });
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

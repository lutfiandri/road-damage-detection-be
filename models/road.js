import mongoose from 'mongoose';

const roadScheme = new mongoose.Schema(
  {
    title: String,
    videoUrl: String,
    locations: [
      {
        microTime: Number,
        latitude: Number,
        longitude: Number,
      },
    ],
    detections: [
      {
        frame: Number,
        predictions: [
          {
            class: String,
            classId: Number,
            confidence: Number,
            xMin: Number,
            yMin: Number,
            xMax: Number,
            yMax: Number,
          },
        ],
      },
    ],
    totalDetection: Number,
  },
  { timestamps: true }
);

const Road = mongoose.model('Road', roadScheme);

export default Road;

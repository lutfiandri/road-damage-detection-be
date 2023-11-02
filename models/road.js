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
    detectionMeta: {
      startedAt: Date,
      endedAt: Date,
      status: {
        type: String,
        enum: ['not-started', 'processing', 'done', 'error'],
        default: 'not-started',
      },
      errorMessage: String,
      totalDamage: Number,
    },
    detections: [
      {
        frame: Number,
        time: Number,
        location: {
          latitude: Number,
          longitude: Number,
        },
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
  },
  { timestamps: true }
);

const Road = mongoose.model('Road', roadScheme);

export default Road;

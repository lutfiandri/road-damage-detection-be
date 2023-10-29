import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import getenv from './utils/helpers/getenv';

import roadRoute from './routes/roadRoute';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URI = getenv('MONGO_URI');

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to mongodb'))
  .catch((err) => {
    console.error(`Can't connect to mongodb`);
    console.error(err);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('road-damage-detection-be');
});

app.use('/roads', roadRoute);

app.listen(5000, () => console.log('road-damage-detection-be started...'));

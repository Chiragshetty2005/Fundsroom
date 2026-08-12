import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { challanRouter } from './routes/challans.js';
import { customerRouter } from './routes/customers.js';
import { healthRouter } from './routes/health.js';
import { inventoryRouter } from './routes/inventory.js';
import { productRouter } from './routes/products.js';
import { usersRouter } from './routes/users.js';

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({ message: "Server up and running...." })
})
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/challans', challanRouter);
app.use('/api/health', healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);



import express from 'express';
import { PrismaClient } from '@prisma/client'
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();
const app = express();

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });


app.use(Sentry.Handlers.requestHandler());

app.use(Sentry.Handlers.tracingHandler());

app.get("/", function rootHandler(req, res) {
  res.end("Hello world!");
});

app.use(Sentry.Handlers.errorHandler());

// @ts-ignore
app.use(function onError(err, req, res, next) {
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});


app.get("/users/:id", async function mainHandler(req, res) {
    const id = req.params.id;

    if (!id) {
        res.status(400).send('User id is required');
    }

    const user = await prisma.pfp.findFirst({
        where: {
            user_id: id
        }
    });

    if (!user) {
        res.status(404).send('User not found');
    }

    // user.image is the profile picture stored as BLOB in the database. Return it as an image
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(user.image);
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
import * as path from 'path';

import * as csurf from 'csurf';
import * as express from 'express';
import * as session from 'express-session';
import * as helmet from 'helmet';
import * as logger from 'morgan';

import {
  Class,
  Config,
  makeControllerRoutes,
  ServiceManager
} from '../core';
import { createMiddleware } from './create-middleware';
import { handleErrors } from './handle-errors';
import { notFound } from './not-found';

export interface CreateAppOptions {
  store?(session): any;
}

export function createApp(rootControllerClass: Class, options: CreateAppOptions = {}) {
  const app = express();

  app.use(logger('[:date] ":method :url HTTP/:http-version" :status - :response-time ms'));
  app.use(express.static(path.join(process.cwd(), Config.get('settings', 'staticUrl', '/public') as string)));
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    cookie: {
      domain: Config.get('settings', 'sessionCookieDomain'),
      httpOnly: Config.get('settings', 'sessionCookieHttpOnly'),
      maxAge: Config.get('settings', 'sessionCookieMaxAge'),
      path: Config.get('settings', 'sessionCookiePath'),
      secure: Config.get('settings', 'sessionCookieSecure'),
    },
    name: Config.get('settings', 'sessionName'),
    resave: Config.get('settings', 'sessionResave', false),
    saveUninitialized: Config.get('settings', 'sessionSaveUninitialized', true),
    secret: Config.get('settings', 'sessionSecret', 'default_secret'),
    store: options.store ? options.store(session) : undefined,
  }));

  if (Config.get('settings', 'csrf', false) as boolean) {
    app.use(csurf());
  }
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).send('Bad csrf token.');
      return;
    }
    next(err);
  });

  const services = new ServiceManager();
  const routes = makeControllerRoutes('', [], rootControllerClass, services);
  for (const route of routes) {
    switch (route.httpMethod) {
      case 'DELETE':
        app.delete(route.path, createMiddleware(route, services));
        break;
      case 'GET':
        app.get(route.path, createMiddleware(route, services));
        break;
      case 'PATCH':
        app.patch(route.path, createMiddleware(route, services));
        break;
      case 'POST':
        app.post(route.path, createMiddleware(route, services));
        break;
      case 'PUT':
        app.put(route.path, createMiddleware(route, services));
        break;
    }
  }
  app.use(notFound());
  app.use(handleErrors(Config.get('settings', 'debug', false) as boolean, console.error));

  return app;
}

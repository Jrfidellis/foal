import {
  Context,
  isHttpResponse,
  isHttpResponseRedirect,
  Route,
  ServiceManager
} from '../core';

export function createMiddleware(route: Route, services: ServiceManager): (...args) => any {
  return async (req, res, next) => {
    try {
      const ctx = new Context(req);
      let response;
      for (const hook of route.hooks) {
        response = await hook(ctx, services);
        if (isHttpResponse(response)) {
          break;
        }
      }
      if (!isHttpResponse(response)) {
        response = await route.controller[route.propertyKey](ctx);
      }

      if (!isHttpResponse(response)) {
        throw new Error(`The controller method "${route.propertyKey}" should return an HttpResponse.`);
      }

      res.status(response.statusCode);
      res.set(response.getHeaders());
      const cookies = response.getCookies();
      // tslint:disable-next-line:forin
      for (const cookieName in cookies) {
        res.cookie(cookieName, cookies[cookieName].value, cookies[cookieName].options);
      }

      if (isHttpResponseRedirect(response)) {
        res.redirect(response.path);
        return;
      }

      if (typeof response.body === 'number') {
        response.body = response.body.toString();
      }
      res.send(response.body);
    } catch (err) {
      next(err);
    }
  };
}

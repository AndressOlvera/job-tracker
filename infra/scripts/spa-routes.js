// CloudFront Function para las rutas de la app (frontend.tf).
//
// Las rutas de React (/stats, /applications/3/edit...) no son archivos en S3:
// a esas se les responde con index.html y React Router muestra la pantalla que
// toca. Es lo mismo que hace `try_files $uri /index.html` en Nginx.
// Las rutas con extensión (/assets/index-4f3a2b1c.js, /favicon.svg) son
// archivos y se piden tal cual.
function handler(event) {
  var request = event.request;
  var lastSegment = request.uri.split('/').pop();

  if (!lastSegment.includes('.')) {
    request.uri = '/index.html';
  }
  return request;
}

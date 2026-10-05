-- Se ejecuta solo la primera vez que se crea el volumen de la base de datos.
-- Crea una base de datos separada para las pruebas automáticas, para que
-- pytest nunca toque los datos con los que trabajas en desarrollo.
CREATE DATABASE jobtracker_test;

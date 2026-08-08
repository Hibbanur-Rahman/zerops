/**
 * A reference set of well-known, high-traffic npm package names, used only
 * to flag names that are suspiciously *similar* to one of these (potential
 * typosquatting) -- not an allowlist or a claim of safety for the packages
 * themselves.
 */
export const POPULAR_NPM_PACKAGES: readonly string[] = [
  'lodash', 'react', 'react-dom', 'express', 'axios', 'chalk', 'commander', 'debug', 'moment',
  'request', 'async', 'underscore', 'webpack', 'babel-core', 'eslint', 'jest', 'mocha', 'chai',
  'typescript', 'vue', 'angular', 'jquery', 'bootstrap', 'classnames', 'uuid', 'dotenv', 'cors',
  'body-parser', 'cookie-parser', 'mongoose', 'sequelize', 'pg', 'mysql', 'redis', 'ioredis',
  'socket.io', 'ws', 'node-fetch', 'form-data', 'qs', 'yargs', 'minimist', 'glob', 'rimraf',
  'mkdirp', 'fs-extra', 'chokidar', 'nodemon', 'pm2', 'winston', 'pino', 'bunyan', 'joi', 'zod',
  'yup', 'ajv', 'validator', 'bcrypt', 'bcryptjs', 'jsonwebtoken', 'passport', 'helmet', 'multer',
  'nodemailer', 'stripe', 'aws-sdk', 'firebase', 'graphql', 'apollo-server', 'next', 'nuxt',
  'gatsby', 'vite', 'rollup', 'esbuild', 'prettier', 'tslib', 'core-js', 'rxjs', 'immutable',
  'redux', 'mobx', 'styled-components', 'tailwindcss', 'sass', 'less', 'postcss', 'semver',
  'colors', 'inquirer', 'ora', 'boxen', 'figlet', 'table', 'csv-parser', 'xml2js', 'cheerio',
  'puppeteer', 'playwright', 'selenium-webdriver', 'sharp', 'jimp', 'exceljs', 'pdfkit',
];

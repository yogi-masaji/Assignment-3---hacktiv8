const request = require('supertest');
const app = require('./../app');
const { sequelize } = require('./../models/index');
const { queryInterface } = sequelize;
const { hash } = require('./../helpers/hash');
const { sign } = require('../helpers/jwt');

const user = {
  username: 'acong',
  email: 'acong@mail.com',
  password: 'password',
  createdAt: new Date(),
  updatedAt: new Date()
};
const userToken = sign({ id: 1, email: user.email });
const userNotExistsToken = sign({ id: 99, email: 'notexists@mail.com' });

const defaultPhoto = {
  title: 'Default Photo',
  caption: 'Default Photo caption',
  image_url: 'http://image.com/defaultphoto.png',
  createdAt: new Date(),
  updatedAt: new Date(),
  UserId: 1
};

beforeAll(async () => {
  await queryInterface.bulkDelete('Photos', null, {
    truncate: true,
    restartIdentity: true,
    cascade: true
  });
  await queryInterface.bulkDelete('Users', null, {
    truncate: true,
    restartIdentity: true,
    cascade: true
  });
  const hashedUser = { ...user };
  hashedUser.password = hash(hashedUser.password);
  await queryInterface.bulkInsert('Users', [hashedUser]);
  await queryInterface.bulkInsert('Photos', [defaultPhoto]);
});

afterAll(async () => {
  sequelize.close();
});

describe('GET /photos', () => {
  test('should return HTTP status code 200', async () => {
    const { body } = await request(app)
      .get('/photos')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(body.length).toBe(1);
    expect(body[0]).toEqual({
      id: 1,
      title: defaultPhoto.title,
      caption: defaultPhoto.caption,
      image_url: defaultPhoto.image_url,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      UserId: 1
    });
  });
  test('should return HTTP status code 401 when no authorization', async () => {
    const { body } = await request(app)
      .get('/photos')
      .expect(401);
    expect(body.message).toMatch(/unauthorized/i);
  });
  test('should return HTTP status code 401 when no token provided', async () => {
    const { body } = await request(app)
      .get('/photos')
      .set('Authorization', 'Bearer ')
      .expect(401);
    expect(body.message).toMatch(/invalid token/i);
  });
  test('should return HTTP status code 401 when no token provided', async () => {
    const { body } = await request(app)
      .get('/photos')
      .set('Authorization', 'Bearer wrong.token.input')
      .expect(401);
    expect(body.message).toMatch(/invalid token/i);
  });
  test('should return HTTP status code 401 when user does not exist', async () => {
    const { body } = await request(app)
      .get('/photos')
      .set('Authorization', `Bearer ${userNotExistsToken}`)
      .expect(401);
    expect(body.message).toMatch(/unauthorized/i);
  });
});

describe('GET /photos/:id', () => {
  test('should return HTTP status code 200', async () => {
    const id = 1;
    const { body } = await request(app)
      .get(`/photos/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
      expect(body).toEqual({
        User: {
          id: 1,
          email: user.email,
          username: user.username
        },
        id: 1,
      title: defaultPhoto.title,
      image_url: defaultPhoto.image_url,
      caption: defaultPhoto.caption,
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
      });
  });
  test('should return HTTP status code 404 when id not found', async () => {
    const id = 2;
    const { body } = await request(app)
      .get(`/photos/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
      expect(body.message).toMatch('data not found');
  });
});

describe('POST /photos', () => {
  test('should return HTTP status code 201', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({title: defaultPhoto.title, image_url: defaultPhoto.image_url})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(201);
    expect(body).toEqual({
      id: 2,
      title: defaultPhoto.title,
      image_url: defaultPhoto.image_url,
      caption: defaultPhoto.title.toUpperCase()+' '+defaultPhoto.image_url,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      UserId: 1
    });
  });
  test('should return HTTP status code 400 when create without title', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({image_url: defaultPhoto.image_url})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(400);
    expect(body.message[0]).toMatch('Title cannot be omitted');
  });
  test('should return HTTP status code 400 when create with empty string title', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({title: '', image_url: defaultPhoto.image_url})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(400);
    expect(body.message[0]).toMatch('Title cannot be an empty string');
  });
  test('should return HTTP status code 400 when create without image url', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({title: defaultPhoto.title})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(400);
    expect(body.message[0]).toMatch('Image URL cannot be omitted');
  });
  test('should return HTTP status code 400 when create with empty string image_url', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({title: defaultPhoto.title, image_url: ''})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(400);
    expect(body.message[0]).toMatch('Image URL cannot be an empty string');
  });
  test('should return HTTP status code 400 when create with wrong format url', async () => {
    const { body } = await request(app)
    .post('/photos')
    .send({title: defaultPhoto.title, image_url: 'image_url'})
    .set('Authorization', `Bearer ${userToken}`)
    .expect(400);
    expect(body.message[0]).toMatch('Wrong URL format');
  });
});


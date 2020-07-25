const knex = require('knex')
const app = require('../src/app')
const { makeArticlesArray, makeMaliciousArticle } = require('./folders.fixtures')

describe('Articles Endpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('folders').truncate())

  afterEach('cleanup',() => db('folders').truncate())

  describe(`GET /api/folders`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })

    context('Given there are folders in the database', () => {
      const testArticles = makeArticlesArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testArticles)
      })

      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testArticles)
      })
    })

    context(`Given an XSS attack folder`, () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle()

      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert([ maliciousArticle ])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedArticle.title)
            expect(res.body[0].content).to.eql(expectedArticle.content)
          })
      })
    })
  })

  describe(`GET /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      })
    })

    context('Given there are folders in the database', () => {
      const testArticles = makeArticlesArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testArticles)
      })

      it('responds with 200 and the specified folder', () => {
        const folderId = 2
        const expectedArticle = testArticles[folderId - 1]
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedArticle)
      })
    })

    context(`Given an XSS attack folder`, () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle()

      beforeEach('insert malicious folder', () => {
        return db
          .into('folders')
          .insert([ maliciousArticle ])
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders/${maliciousArticle.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedArticle.title)
            expect(res.body.content).to.eql(expectedArticle.content)
          })
      })
    })
  })

  describe(`POST /api/folders`, () => {
    it(`creates an folder, responding with 201 and the new folder`, () => {
      const newArticle = {
        title: 'Test new folder',
        style: 'Listicle',
        content: 'Test new folder content...'
      }
      return supertest(app)
        .post('/api/folders')
        .send(newArticle)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newArticle.title)
          expect(res.body.style).to.eql(newArticle.style)
          expect(res.body.content).to.eql(newArticle.content)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
          const expected = new Date().toLocaleString()
          const actual = new Date(res.body.date_published).toLocaleString()
          expect(actual).to.eql(expected)
        })
        .then(res =>
          supertest(app)
            .get(`/api/folders/${res.body.id}`)
            .expect(res.body)
        )
    })

    const requiredFields = ['title', 'style', 'content']

    requiredFields.forEach(field => {
      const newArticle = {
        title: 'Test new folder',
        style: 'Listicle',
        content: 'Test new folder content...'
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newArticle[field]

        return supertest(app)
          .post('/api/folders')
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })

    it('removes XSS attack content from response', () => {
      const { maliciousArticle, expectedArticle } = makeMaliciousArticle()
      return supertest(app)
        .post(`/api/folders`)
        .send(maliciousArticle)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedArticle.title)
          expect(res.body.content).to.eql(expectedArticle.content)
        })
    })
  })

  describe(`DELETE /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      })
    })

    context('Given there are folders in the database', () => {
      const testArticles = makeArticlesArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testArticles)
      })

      it('responds with 204 and removes the folder', () => {
        const idToRemove = 2
        const expectedArticles = testArticles.filter(folder => folder.id !== idToRemove)
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedArticles)
          )
      })
    })
  })

  describe(`PATCH /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      })
    })

    context('Given there are folders in the database', () => {
      const testArticles = makeArticlesArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testArticles)
      })

      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 2
        const updateArticle = {
          title: 'updated folder title',
          style: 'Interview',
          content: 'updated folder content',
        }
        const expectedArticle = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle
        }
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateArticle)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedArticle)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must content either 'title', 'style' or 'content'`
            }
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateArticle = {
          title: 'updated folder title',
        }
        const expectedArticle = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle
        }

        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({
            ...updateArticle,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedArticle)
          )
      })
    })
  })
})

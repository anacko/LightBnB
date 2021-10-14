const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = LOWER($1)`, [email])
    .then(res => res.rows[0])
    .catch(() => null);
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then(res => res.rows[0])
    .catch(() => null);
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
    [user.name, user.email, user.password])
    .then(res => res.rows[0].id)
    .catch(() => null);
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guestId The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guestId, limit = 10) {
  return pool
    .query(`
    SELECT reservations.*, properties.*, avg(rating) as average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
        AND reservations.end_date < now()::date
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT $2;
    `,
    [guestId, limit])
    .then(res => res.rows)
    .catch(null);
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const insertParam = function(param, refArr, strBef, strAft) {
    if (!param) return "";
    if (strBef.slice(strBef.length - 4) === 'LIKE') param = `%${param}%`;
    refArr.push(param);
    return `${strBef} $${refArr.length} ${strAft}`;
  };
  const params = [];
  let queryString = `SELECT properties.*, avg(rating) AS average_rating
      FROM properties
      JOIN property_reviews ON properties.id = property_id
      ${insertParam(options.city, params, 'WHERE city LIKE','')}
      ${insertParam(options.owner_id, params, params.length ? 'AND owner_id =' : 'WHERE owner_id =','')}
      ${insertParam(options.minimum_price_per_night * 100, params, params.length ? 'AND cost_per_night >=' : 'WHERE cost_per_night >=','')}
      ${insertParam(options.maximum_price_per_night * 100, params, params.length ? 'AND cost_per_night <=' : 'WHERE cost_per_night <=','')}
      GROUP BY properties.id
      ${insertParam(options.minimum_rating, params, 'HAVING avg(rating) >=','')}
      ${insertParam(limit, params, 'LIMIT','')};`;
      
  return pool
    .query(queryString, params)
    .then(res => res.rows)
    .catch((err) => err.message);
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
  const insertValue = function(value, refArr) {
    refArr.push(value);
    return `$${refArr.length}`;
  };
  const params = [];
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
  VALUES
  (${insertValue(property.owner_id, params)},${insertValue(property.title, params)},${insertValue(property.description, params)},
  ${insertValue(property.thumbnail_photo_url, params)}, ${insertValue(property.cover_photo_url, params)},
  ${insertValue(property.cost_per_night, params)}, ${insertValue(property.street, params)}, ${insertValue(property.city, params)},
  ${insertValue(property.province, params)}, ${insertValue(property.post_code, params)}, ${insertValue(property.country, params)}, 
  ${insertValue(property.parking_spaces, params)}, ${insertValue(property.number_of_bathrooms, params)}, 
  ${insertValue(property.number_of_bedrooms, params)})
  RETURNING *;`;
  return pool.query(queryString, params); // <<- only the promise
};
exports.addProperty = addProperty;
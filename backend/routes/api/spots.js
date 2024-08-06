const express = require('express');
const bcrypt = require('bcryptjs');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Spot, SpotImage} = require('../../db/models');

//import check function and handleValidationError function for validating signup
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');

const router = express.Router();

const validateSpot = [
  check('address')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('Street address is required'),
  check('city')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('City is required'),
  check('state')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('State is required'),
  check('country')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('Country is required'),
  check('lat')
    .exists({ checkNull: true })
    .isFloat({min: -90, max: 90})
    .withMessage('Latitude must be within -90 and 90'),
  check('lng')
    .exists({ checkNull: true })
    .isFloat({min: -180, max: 180})
    .withMessage('Longitude must be within -180 and 180'),
  check('name')
    .exists({ checkFalsy: true })
    .notEmpty()
    .isLength({min: 1, max: 49})
    .withMessage('Name must be less than 50 characters'),
  check('description')
    .exists({ checkFalsy: true })
    .notEmpty()
    .withMessage('Description is required'),
  check('price')
    .exists({ checkFalsy: true })
    .isFloat({min: 1})
    .withMessage('Price per day must be a positive number'),
handleValidationErrors
];

//get all spots
router.get('/', async (req, res)=> {
  const spots = await Spot.findAll();
  // add avgRating and previewImg to response body when reviews table's created
  res.status(200);
  return res.json({'Spots': spots});
});

//create a new spot
router.post('/', requireAuth, validateSpot, async (req, res) => {
  const { user } = req;
  const {address, city, state, country, lat, lng, name, description, price} = req.body;

  try{
    const id = user.id;
    const newSpot = await Spot.create({
      ownerId: id,
      address,
      city,
      state,
      country,
      lat,
      lng,
      name,
      description,
      price
    });

    res.status(201).json(newSpot);
  } catch(err) {
    return res.json({errors: err.errors});
  }
});

//get all spots owned by the current user
router.get('/current', requireAuth, async(req, res, next) => {
  const { user } = req;
  const ownerId = user.id;

  const spots = await Spot.findAll({where: ownerId});

  res.json({
    Spots: spots
  });
})

//get details of a spot from an id
router.get('/:id', async(req, res, next) => {
  const { id } = req.params
  const spot = await Spot.findByPk(id);

  if (spot) {
    res.json(spot);
  } else {
    res.status(404).json({
      message: "Spot couldn't be found"
    })
  }
});

//edit a spot
router.put('/:id', requireAuth, validateSpot, async(req, res, next) => {
  const { user } = req;
  const { id:spotId } = req.params;
  const userId = user.id;
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404).json({
      "message": "Spot couldn't be found"
    })
  };

  if (spot.ownerId === userId) {
    await spot.update(req.body);
    res.json(spot);
  } else {
    res.status(403).json({
      "message": "Forbidden"
    })
  }

});

//delete a spot 
router.delete('/:id', requireAuth, async(req, res, next) => {
  const { id: spotId } = req.params;
  const { user } = req;
  const userId = user.id;
  const spot = await Spot.findByPk(spotId);

  if (!spot) {
    res.status(404).json({
      "message": "Spot couldn't be found"
    })
  }

  if (spot.ownerId === userId) {
    await spot.destroy();
    res.json({
      "message": "Successfully deleted"
    })
    
  } else {
    res.status(403).json({
      "message": "Forbidden"
    })
  }
  
});

//add an img to a spot based on spot id
router.post('/:id/images', requireAuth, async(req, res, next) => {
  const { id } = req.params;
  const { url, preview } = req.body;
  const { user } = req;
  const spot = await Spot.findByPk(id);

  if (user.id !== spot.ownerId) {
    return res.status(403).json({
      "message": "Forbidden"
    })
  };

  if (!spot) res.status(404).json({"message": "Spot couldn't be found"});

  const newImg = await spot.createSpotImage({
    url,
    preview
  });

  res.json(newImg);
})


module.exports = router;
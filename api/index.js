const express = require('express');
const router = express.Router();



// const testData = JSON.parse(fs.readFileSync('./api/testData.json', 'utf-8'));
const { writeFile, readFile } = require('fs');

const testData = './api/testData.json';

// @desc    get exchange data
// @route   GET /exchange
router.get('/exchange', (req, res, next) => {
  readFile(testData, (error, data) => {
    if (error) {
      console.log(error);
      return res.json({});
    }
    console.log(typeof data)
    return res.json(JSON.parse(data).reverse());
  });
})

// @desc    get post data
// @route   GET /exchange/post/:postId
router.get('/exchange/post/:postId', (req, res, next) => {
  let postId = parseInt(req.params.postId);

  readFile(testData, (error, data) => {
    let post = JSON.parse(data).find(el => el.id == postId);

    if( post ) return res.json( post )
    return res.json({}); // throw 404 error || unexcepted
  });
})


// @desc   create post
// @route  POST /exchange
router.post('/exchange', (req, res, next) => {
  const randomId = Math.round(Math.random()*10000);

  let newPost = {
    ...req.body,
    id: randomId
  }

  readFile(testData, (error, data) => {
    if (error) return res.json({});

    const parsedData = JSON.parse(data);
    parsedData.push(newPost);

    writeFile(testData, JSON.stringify(parsedData, null, 2), (err) => {
      if ( err ) {
        console.log('Failed to write updated data to file');
        return res.json({});
      }

      console.log('Updated file successfully');
      return res.json({ id: randomId });
    });
  });
});

// @desc   remove post
// @route  DELETE /exchange/post/:postId
router.delete('/exchange/post/:postId', (req, res, next) => {
  let postId = parseInt(req.params.postId);

  readFile(testData, (error, data) => {
    if (error) return res.json({});

    const parsedData = JSON.parse(data);
    let index;
    parsedData.find((el, i) => {
      if(el.id == postId) return index = i;
    });
    console.log(index)
    parsedData.splice(index, 1);

    //console.log(parsedData)
    //console.log(index + 'ataat')
    //console.log(index)

    writeFile(testData, JSON.stringify(parsedData, null, 2), (err) => {
      if ( err ) {
        console.log('Failed to write updated data to file');
        return res.json({});
      }

      console.log('Updated file successfully');
      return res.json({});
    });
  });
})


// @desc   like post
// @route  PATCH /exchange/post/:postId
router.patch('/exchange/post/:postId', (req, res, next) => {
  let postId = parseInt(req.params.postId);

  readFile(testData, (error, data) => {
    if (error) return res.json({});

    const parsedData = JSON.parse(data);

    parsedData.find((el, i) => {
      if(el.id == postId) el.isLiked = req.body.isLiked;
    });

    writeFile(testData, JSON.stringify(parsedData, null, 2), (err) => {
      if ( err ) {
        console.log('Failed to write updated data to file');
        return res.json({});
      }

      console.log('Updated file successfully');
      return res.json({});
    });
  });
})


module.exports = router
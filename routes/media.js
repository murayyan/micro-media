const express = require("express");
const router = express.Router();
const isBase64 = require("is-base64");
const base64Img = require("base64-img");
const fs = require("fs");

const { Media } = require("../models");

// API get all images
router.get("/", async (req, res) => {
  // find all from database
  const data = await Media.findAll({
    attributes: ["id", "image"],
  });
  // mapping host to filename
  const media = data.map((data) => {
    data.image = `${req.get("host")}/${data.image}`;
    return data;
  });

  return res.json({
    status: "success",
    data: media,
  });
});

// API save image
router.post("/", (req, res, next) => {
  const image = req.body.image;

  // check is base64?
  if (!isBase64(image, { mimeRequired: true })) {
    return res.status(400).json({ status: "error", message: "invalid base64" });
  }

  // upload image
  base64Img.img(
    image,
    "./public/images",
    Date.now(),
    async (error, filepath) => {
      // if failed upload image
      if (error) {
        return res
          .status(400)
          .json({ status: "error", message: error.message });
      }

      // split and get last element
      const filename = filepath.split("/").pop();

      // save to database
      const media = await Media.create({ image: `images/${filename}` });

      return res.json({
        status: "success",
        data: {
          id: media.id,
          image: `${req.get("host")}/images/${filename}`,
        },
      });
    }
  );
});

// API delete image
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  // find media by pk id
  const media = await Media.findByPk(id);

  // if media not found
  if (!media) {
    return res
      .status(404)
      .json({ status: "error", message: "media not found" });
  }

  // delete image from dir
  fs.unlink(`./public/${media.image}`, async (error) => {
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    // delete image from db
    await media.destroy();

    return res.json({ status: "success", message: "image deleted" });
  });
});

module.exports = router;

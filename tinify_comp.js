import tinify from 'tinify';
import fs from "fs";
import path from "path";
import config from './config.js';

tinify.key = config.api_key;
const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.svg'];
const folderPath = './';

// 递归遍历文件夹
const getImagesInFolder = (folderPath, images = []) => {
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    const filePath = path.resolve(folderPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getImagesInFolder(filePath, images);
    } else if (isImageFile(file)) {
      images.push(filePath);
    }
  });
  return images;
};


const isImageFile = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
};

const zipImage = (path) => {
  fs.readFile(path, (err, sourceData) => {
    if (err) {
      throw err;
    }
    tinify.fromBuffer(sourceData).toBuffer((err, resultData) => {
      if (err) {
        throw err;
      }
      console.log(path, '压缩成功');
      fs.writeFile(path, resultData, (err => {
        if (err) {
          throw err;
        }
        console.log(path, '写入成功');
      }));
    });
  });
};

const imagePaths = getImagesInFolder(folderPath);
console.log('All image paths:', imagePaths);

imagePaths.forEach(item => zipImage(item));
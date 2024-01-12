import sharp from 'sharp';
import fs from "fs";
import path from "path";
import chalk from "chalk";

const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.svg'];
const outputFolder = './output';
const RunFolder = './';

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


const imageSizeFormat = (imageSize) => {
  if (imageSize < 1024) {
    return `${imageSize} B`;
  } else if (imageSize < 1048576) {
    const sizeInKB = (imageSize / 1024).toFixed(2);
    return `${sizeInKB} KB`;
  } else {
    const sizeInMB = (imageSize / 1048576).toFixed(2);
    return `${sizeInMB} MB`;
  }
};


// 获取文件大小
const getImageSize = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

// 计算百分比变化
const calculatePercentageChange = (oldSize, newSize) => {
  const percentageChange = ((newSize - oldSize) / oldSize) * 100;
  if (percentageChange > 0)
    return "↑" + percentageChange.toFixed(2) + "%";
  else
    return "↓" + (-percentageChange.toFixed(2)) + "%";
};


const sharpComp = (inputPath) => {
  // 计算输出路径，没有则进行创建
  const outputFolderPath = path.join(outputFolder, path.dirname(path.relative(RunFolder, inputPath)));
  const outputPath = path.join(outputFolderPath, path.basename(inputPath));
  if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath, { recursive: true });
  }

  sharp(inputPath).webp({ quality: 75, effort: 5 }).toFile(outputPath, (err) => {
    if (err) {
      console.error(err);
    }
    const oldImageSize = getImageSize(inputPath);
    const newImageSize = getImageSize(outputPath);
    const compPercent = calculatePercentageChange(oldImageSize, newImageSize);
    console.log(chalk.cyan(inputPath) + ": " + chalk.yellow(imageSizeFormat(oldImageSize)));
    console.log("├─ " + chalk.cyan(outputPath) + ": " + chalk.yellow(imageSizeFormat(newImageSize)));
    if (compPercent.startsWith('↓')) {
      console.log("└─ " + chalk.green(`[${compPercent}]`) + "\n");
    } else if (compPercent.startsWith('↑')) {
      console.log("└─ " + chalk.red(`[${compPercent}]`) + "\n");
    } else {
      console.log("└─ " + `[${compPercent}]` + "\n");
    }
  });
};

const startCompImage = () => {
  const imagePaths = getImagesInFolder(RunFolder);
  console.log('all image paths:', imagePaths);
  imagePaths.forEach(item => sharpComp(item));
};

startCompImage();
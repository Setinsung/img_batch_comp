import 'chromedriver';
import { Builder, By, until } from 'selenium-webdriver';
import fs from 'fs';
import path from "path";
import chalk from 'chalk';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'process';

const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.svg'];
const outputFolder = './output';
const RunFolder = './';
const rl = readline.createInterface({ input, output });
const driver = new Builder().forBrowser('chrome').build();

// blob图片链接转base64编码脚本
const injectScript = function (blobUrl) {
  console.log('arguments', arguments);
  var uri = arguments[0];
  var callback = arguments[arguments.length - 1];
  var toBase64 = function (buffer) {
    for (var r, n = new Uint8Array(buffer), t = n.length, a = new Uint8Array(4 * Math.ceil(t / 3)), i = new Uint8Array(64), o = 0, c = 0; 64 > c; ++c)
      i[c] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charCodeAt(c); for (c = 0; t - t % 3 > c; c += 3, o += 4)r = n[c] << 16 | n[c + 1] << 8 | n[c + 2], a[o] = i[r >> 18], a[o + 1] = i[r >> 12 & 63], a[o + 2] = i[r >> 6 & 63], a[o + 3] = i[63 & r]; return t % 3 === 1 ? (r = n[t - 1], a[o] = i[r >> 2], a[o + 1] = i[r << 4 & 63], a[o + 2] = 61, a[o + 3] = 61) : t % 3 === 2 && (r = (n[t - 2] << 8) + n[t - 1], a[o] = i[r >> 10], a[o + 1] = i[r >> 4 & 63], a[o + 2] = i[r << 2 & 63], a[o + 3] = 61), new TextDecoder("ascii").decode(a);
  };
  var xhr = new XMLHttpRequest();
  xhr.responseType = 'arraybuffer';
  xhr.onload = function () { callback(toBase64(xhr.response)); };
  xhr.onerror = function () { callback(xhr.status); };
  xhr.open('GET', uri);
  xhr.send();
};


const chromeAutoOperation = async (inputPath) => {
  await driver.get('https://squoosh.app');
  await driver.findElement(By.className("_hide_vzxu7_18")).sendKeys(inputPath);
  await driver.wait(until.elementsLocated(By.className("_builtin-select_1onzk_5")), 5000);
  const selects = await driver.findElements(By.className("_builtin-select_1onzk_5"));
  await selects[1].sendKeys("WebP");
  try {
    await driver.wait(until.elementsLocated(By.className("_spinner-container_18q42_141")), 1000);
    const load = await driver.findElement(By.className("_spinner-container_18q42_141"));
    await driver.wait(until.stalenessOf(load));
  } catch (error) {
    // if (!(error instanceof TimeoutError))
    //   throw error;
    // if (!(error instanceof NoSuchElementError))
    //   throw error;
  }

  // 获取blob链接
  await driver.wait(until.elementsLocated(By.xpath('//*[@id="app"]/div/file-drop/div/div[4]/div[2]/a')), 1000);
  const link = await driver.findElement(By.xpath('//*[@id="app"]/div/file-drop/div/div[4]/div[2]/a'));
  let blobLink = null;
  const timeout = 2000;
  const startTime = Date.now();
  while (blobLink === null && (Date.now() - startTime) < timeout) {
    blobLink = await link.getAttribute("href");
  }
  if (blobLink === null) throw new Error('blob link not found');

  // 获取图片大小等文本
  const oldImageSize = await driver.findElement(By.xpath('//*[@id="app"]/div/file-drop/div/div[3]/div[2]/div[2]/div/div[1]/div')).getText();
  const newImageSize = await driver.findElement(By.xpath('//*[@id="app"]/div/file-drop/div/div[4]/div[2]/div[2]/div/div[1]/div')).getText();
  let compPercent = await driver.findElement(By.xpath('//*[@id="app"]/div/file-drop/div/div[4]/div[2]/div[2]/div/div[2]/div')).getText();
  compPercent = compPercent.replace(/\n/g, '');

  // 注入脚本请求获得图片buffer
  const base64Res = await driver.executeAsyncScript(injectScript, blobLink);
  if (typeof base64Res === 'number') throw new Error('request failed, code: ' + base64Res);
  const buffer = Buffer.from(base64Res, 'base64');

  // 计算输出路径，没有则进行创建
  const outputFolderPath = path.join(outputFolder, path.dirname(path.relative(RunFolder, inputPath)));
  const outputPath = path.join(outputFolderPath, path.basename(inputPath));
  if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath, { recursive: true });
  }

  // 写入图片并打印结果
  fs.writeFile(outputPath, buffer, function (err) {
    if (err) { console.log(err); }
    console.log(chalk.cyan(inputPath) + ": " + chalk.yellow(oldImageSize));
    console.log("├─ " + chalk.cyan(outputPath) + ": " + chalk.yellow(newImageSize));
    if (compPercent.startsWith('↓')) {
      console.log("└─ " + chalk.green(`[${compPercent}]`) + "\n");
    } else if (compPercent.startsWith('↑')) {
      console.log("└─ " + chalk.red(`[${compPercent}]`) + "\n");
    } else {
      console.log("└─ " + `[${compPercent}]` + "\n");
    }
  });
};



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


const startCompImage = async () => {
  const imagePaths = getImagesInFolder(RunFolder);
  console.log('all image paths:', imagePaths);
  for (const inputPath of imagePaths) {
    try {
      await chromeAutoOperation(inputPath);
    } catch (error) {
      console.error(chalk.red(`processing image with path ${inputPath} failed\n`), error);
    }
  }
};

startCompImage();

rl.on("close", async () => {
  await driver.close();
  process.exit(0);
});

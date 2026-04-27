'use strict';

/*

  Fans of fractals, rejoice, for I bring you Howie Mandel(brot)'s set of Julia
  Louis-Dreyfus Sets of Jubilation!

  This game will have you generating points in the Julia set like nobody's business
  and will have true Howie and Julia devotees feeling like they've picked the
  million dollar case!
  million bucks!

  Sure, the game is also based on some fancy math things from some dudes named
  Benoit B. Mandelbrot (the B stands for Benoit B. Mandelbrot) and Gaston Julia,
  but who cares about that when you've got Howie "The Big Deal" Mandel and Julia
  "Big Salad" Louis-Dreyfus staring back at you? It's like they're saying "Generate
  those sets, baby. You're doing great, just great!"

  So, if you're ready to join the ranks of the unhinged Howie and Julia fandom, 
  try HMSoJLSoJ and start generating those sets like there's no tomorrow. Who knows,
  maybe Howie and Julia themselves will see your progress and declare you the 
  ultimate fan!

  (This game is mostly idle and will take "a while" but can be completed before
  the heat death of the universe, unlike some games with "Prestige" in the name.)

*/

class App {
  constructor() {
    console.log('init');

    this.storageKey = 'hmsojlsoj';
    this.firstLoad = false;
    this.disableSaves = false;

    this.loadFromStorage();

    this.cmain = document.querySelector('#cmain');

    this.ctx = this.cmain.getContext('2d');

    this.webgl = new WebGLFramework({
      canvasWidth: 1024,
      canvasHeight: 1024,
      canvasBGColor: {r: 0, g: 0, b: 0, a: 0}
    });

    this.webgl.initArrays(1024 * 1024 * 2);


    this.maxProgress = 512 * 512;
    this.maxIter = 1151522780;
    this.rate = 0;
    this.showCompleteJulias = false;
    
    this.level = -1;
    this.initUI();


    this.drawTopGrid();


    const tickInterval = 1000 / 30;
    setInterval(() => this.tick(), tickInterval);
    setInterval(() => this.saveToStorage(), 5000);
    this.draw();

    if (this.firstLoad) {
      this.showModal('helpContainer');
    }

    //this.canvasTest();
  }

  canvasTest() {
    //draw anything on an empty
    const canvas = document.querySelector('#ctest');
    const ctx = canvas.getContext('2d');
    const img = document.querySelector('#imgHM');

    ctx.clearRect(0, 0, 512, 512);

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillRect(100, 40, 300, 30);

    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

    this.ctx.drawImage(ctx.canvas, 0, 0, 512, 512, 0, 0, 512, 512); 

  }

  loadFromStorage() {
    const rawState = localStorage.getItem(this.storageKey);

    this.state = {
      setPoints: 0,
      gridStatus: [],
      marker: -1,
      totalIters: 0
    };

    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        const grid = {
          progress: 0, //progress goes from 0 to 512 * 512
          lastTime: 0,
          iters: 0
        };
        this.state.gridStatus.push(grid);
      }
    }

    if (rawState !== null) {
      const loadedState = JSON.parse(rawState);
      this.state = {...this.state, ...loadedState};
    } else {
      this.state.gameStart = (new Date()).getTime();
      this.firstLoad = true;
    }
  }

  saveToStorage() {
    if (this.disableSaves) {return;}

    const saveString = JSON.stringify(this.state);
    localStorage.setItem(this.storageKey, saveString);
  }

  reset() {
    this.disableSaves = true;
    localStorage.removeItem(this.storageKey);
    window.location.reload();
  }

  import() {
    const importString = this.UI.imexText.value.trim();
    if (importString.length % 8 !== 0) {
      console.error("Corrupted import string. Must be multiple of 8 characters long.");
      return;
    }
    const decodedStr = this.decodeExportStr(importString);
    let state;
    try {
      state = JSON.parse(decodedStr);
    } catch (error) {
      console.error("Corrupted import string. JSON.parse check failed.");
      return;
    }

    this.disableSaves = true;
    localStorage.setItem(this.storageKey, decodedStr);
    window.location.reload();  
  }

  genExportStr() {
    this.saveToStorage();

    const saveString = localStorage.getItem(this.storageKey);
    const compressArray = LZString.compressToUint8Array(saveString);
    const exportChars = 'howiemandeljulialouisdreyfus'.split``;
    let exportArray = new Array(compressArray.length * 8);
    for (let i = 0; i < compressArray.length; i++) {
      const val = compressArray[i];
      for (let b = 7; b >= 0; b--) {
        const bit = (val & (1 << b)) >> b;
        const cif = (i * 8 + (7 - b)) 
        const ci = cif % exportChars.length;
        const c = (bit === 1) ? exportChars[ci].toUpperCase() : exportChars[ci];
        exportArray[cif] = c;
      }
    }

    return exportArray.join``;
  }

  decodeExportStr(str) {
    const arraySize = Math.round(str.length / 8);
    const compressArray = new Uint8Array(arraySize);
    
    for (let i = 0; i < arraySize; i++) {
      let val = 0;
      for (let b = 7; b >=0; b--) {
        const cif = i * 8 + (7 - b);
        const c = str[cif];
        const bit = c === c.toUpperCase() ? 1 : 0;
        val = val | (bit << b);
      }
      compressArray[i] = val;
    }

    const saveString = LZString.decompressFromUint8Array(compressArray);
    return saveString;    
  }

  export() {
    this.UI.imexText.value = this.genExportStr();
  }

  initUI() {
    this.UI = {};

    //get all the elements from the static HTML
    const namedElements = document.querySelectorAll('*[id]');
    for (let i = 0; i < namedElements.length; i++) {
      const namedElement = namedElements.item(i);
      this.UI[namedElement.id] = namedElement;
    }

    this.UI.showMap.disabled = true;

    this.UI.reset.onclick = () => this.showModal('resetConfirm');
    this.UI.resetYes.onclick = () => this.reset();
    this.UI.resetNo.onclick = () => this.closeModal('resetConfirm');
    this.UI.helpClose.onclick = () => this.closeModal('helpContainer');
    this.UI.showHelp.onclick = () => this.showModal('helpContainer');
    this.UI.impExp.onclick = () => this.showModal('imexContainer');
    this.UI.imexImport.onclick = () => this.import();
    this.UI.imexExport.onclick = () => this.export();
    this.UI.imexClose.onclick = () => this.closeModal('imexContainer');
    this.UI.winClose.onclick = () => this.closeModal('winContainer');


    this.cmain.onclick = (evt) => this.onclick(evt);
    this.UI.showMap.onclick = () => this.showMap();
    this.UI.checkShowJulia.onchange = () => this.showJuliaChange();

    //draw fractal text
    let parent = this.UI.infoUpgrades;
    const scale = 0.75;
    let size = 12 * scale;
    while (size > 1) {
      const span = document.createElement('span');
      span.innerText = 'upgrades and to unlock upgrades, you must first unlock ';
      const div = document.createElement('span');
      span.style.fontSize = `${size}px`;
      parent.append(span);
      parent.append(div);
      parent = div;
      size = size * scale;

    }

    this.UI.imgHM1.addEventListener('load', () => this.handleLateHowie());
    this.UI.imgJLD1.addEventListener('load', () => this.handleLateJulia());
  }

  showModal(id) {
    this.UI[id].showModal();
  }

  closeModal(id) {
    this.UI[id].close();
  }

  showMap() {
    this.level = -1;
    this.drawTopGrid();
    this.UI.showMap.disabled = true;
  }

  drawTopGrid() {
    const size = 32;
    const w = this.cmain.width / size;
    this.webgl.resetTriangleIndexes();
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < w; y++) {
        const state = this.state.gridStatus[x + y * w];
        if (this.showCompleteJulias || (state.progress < this.maxProgress)) {
          const cr = this.lerp(-2, 1, x / w);
          const ci = this.lerp(-1.5, 1.5, y / w);
          this.drawJuliaMini(this.ctx, size, x, y, cr, ci, state);
        } else {
          this.drawMandel(this.ctx, x * size, y * size, size, 2);
        }
      }
    }
    this.webgl.draw();
    this.ctx.drawImage(this.webgl.canvas, 0, 0, 1024, 1024, 0, 0, 1024, 1024);
    this.ctx.strokeStyle = 'black';
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < w; y++) {
        this.ctx.strokeRect(x * size, y * size, size, size);
      }
    }

    if (this.state.marker !== -1) {
      const mx = this.state.marker % 32;
      const my = Math.floor(this.state.marker / 32);
      this.ctx.strokeStyle = 'yellow';
      this.ctx.strokeRect(mx * size, my * size, size, size);
    }

  }

  getMandel(x, y, maxIter) {
    let zr = 0;
    let zi = 0;

    let iter = 0;

    let d = 0;

    while (d < 2) {
      //z = z^2 + c
      //zr+zi = zr * zr - zi * zi + 2*zr*zi + x + y
      [zr, zi] = [
        zr * zr - zi * zi + x,
        2 * zr * zi + y
      ];

      d = Math.hypot(zr, zi);

      iter++;

      if (iter >= maxIter) {
        return 0;
      }
    }

    return iter;
  }

  getJulia(x, y, cr, ci, maxIter) {
    let zr = x;
    let zi = y;

    let iter = 0;
    let d = 0;
    while (d < 2) {
      [zr, zi] = [
        zr * zr - zi * zi + cr,
        2 * zr * zi + ci
      ];

      d = Math.hypot(zr, zi);

      iter++;

      if (iter >= maxIter) {
        return 0;
      }
    }

    return iter;
  }

  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  }

  hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // Achromatic (gray)
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      r = hue2rgb(p, q, h / 360 + 1/3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1/3);
    }

    return {
      r: r,
      g: g,
      b: b
    };
  }

  drawMandel(ctx, locx, locy, size, step) {
    //draw black in case howie image is late
    ctx.fillStyle = 'black';
    ctx.fillRect(locx, locy, size, size);
    ctx.drawImage(this.UI.imgHM1, locx, locy, size, size, locx, locy, size, size);
    for (let cx = locx; cx < locx + size; cx += step) {
      for (let cy = locy; cy < locy + size; cy += step) {
        const x = this.lerp(-2, 1, cx / ctx.canvas.width);
        const y = this.lerp(-1.5, 1.5, cy / ctx.canvas.width);
        const val = this.getMandel(x, y, 100);
        let a;
        let rgb;
        if (val === 0) {
          rgb = {r: 0, g: 0, b: 0};
          a = 0;
        } else {
          rgb = this.hslToRgb(val * 360 / 100, 0.5, val === 0 ? 0 : 0.5);
          a = 1;
        }
        this.webgl.addRect(cx, cy, step, step, rgb.r, rgb.g, rgb.b, a);
      }
    }
  }

  drawJuliaMini(ctx, size, xi, yi, cr, ci, state) {
    this.drawJulia(ctx, xi * size, yi * size, size, 2, cr, ci, state);  
  }

  drawJulia(ctx, locx, locy, size, step, cr, ci, state) {
    const big = size > 32;
    const statef = state.progress / this.maxProgress;
    const iw = size / step;
    if (big) {
      //draw black in case julia image is late
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(this.UI.imgJLD1, locx, locy, size, size, locx, locy, size, size); 
    }
    let juliaFunc;
    if (size === 1024 && this.juliaData !== undefined) {
      juliaFunc = (x, y, cr, ci, iter, i) => {
        const val = this.juliaData[i];
        return val === 100 ? 0 : val;
      };
    } else {
      juliaFunc = (x, y, cr, ci, iter, i) => this.getJulia(x, y, cr, ci, iter);
    }
    let i = 0;
    for (let yi = 0; yi < iw; yi++) {
      for (let xi = 0; xi < iw; xi++) {
        const cx = xi * step;
        const cy = yi * step;
        const f = (yi * iw + xi) / (iw * iw);
        const x = this.lerp(-2, 2, cx / size);
        const y = this.lerp(-2, 2, cy / size);
        
        //const val = this.getJulia(x, y, cr, ci, 100);
        const val = juliaFunc(x, y, cr, ci, 100, i);

        let rgb;
        let a = 1;
        if (statef > f) {
          if (val === 0) {
            rgb = {r: 0, g: 0, b: 0};
            if (big) {
              a = 0;
            } else {
              a = 1;
            }
          } else {
            rgb = this.hslToRgb(val * 360 / 100, 0.5, val === 0 ? 0: 0.5);
            a = 1;
          }

        } else {
          rgb = {r: 0.5, g: 0.5, b: 0.5};
          a = 1;
        }
        this.webgl.addRect(cx + locx, cy + locy, step, step, rgb.r, rgb.g, rgb.b, a);
        i++;
      }
    }
  }

  calcJulia(size, step, cr, ci, progress) {
    //progress goes from 0 to 512 * 512
    this.juliaData = new Array((size / step) * (size / step));
    let i = 0;
    this.juliaTotal = 0;
    this.juliaRem = 0;
    for (let cy = 0; cy < size; cy += step) {
      for (let cx = 0; cx < size; cx += step) {
        const x = this.lerp(-2, 2, cx / size);
        const y = this.lerp(-2, 2, cy / size);
        const rawVal = this.getJulia(x, y, cr, ci, 100);
        const val = rawVal === 0 ? 100 : rawVal;
        this.juliaData[i] = val;
        this.juliaTotal += val;
        if (i >= progress) {
          this.juliaRem += val;
        }
        i++;
      }
    }
  }

  tick() {
    this.rate = 10 + 990 * Math.pow(this.state.setPoints / 6656596, 0.5);
    //this.rate = 10000000;
    this.juliaPercent = 0;
    this.mandelPercent = 100 * this.state.totalIters / this.maxIter;
    this.juliaMSRem = 0;
    this.mandelMSRem = Math.max(0, 1000 * (this.maxIter - this.state.totalIters) / this.rate);
    if (this.state.marker !== -1) {
      const gridStatus = this.state.gridStatus[this.state.marker];
      if (gridStatus.progress < this.maxProgress) {
        const cx = this.state.marker % 32;
        const cy = Math.floor(this.state.marker / 32);
        const cr = this.lerp(-2, 1, cx / 32);
        const ci = this.lerp(-1.5, 1.5, cy / 32);

        if (this.juliaData === undefined) {
          this.calcJulia(1024, 2, cr, ci, gridStatus.progress);
        }
  
        const curTime = (new Date()).getTime();
        const deltaTime = gridStatus.lastTime > 0 ? ((curTime - gridStatus.lastTime) / 1000) : 0;
        let itersRemaining = this.rate * deltaTime;
        while (itersRemaining > 0 && gridStatus.progress < this.maxProgress) {
          gridStatus.iters += itersRemaining;
          this.state.totalIters += itersRemaining;
          let itersSpent = itersRemaining;
          itersRemaining = 0;
          if (gridStatus.iters >= this.juliaData[gridStatus.progress]) {
            if (this.juliaData[gridStatus.progress] === 100) {
              this.state.setPoints += 1;
            }
            itersRemaining = gridStatus.iters - this.juliaData[gridStatus.progress];
            this.state.totalIters -= itersRemaining;
            gridStatus.progress++;
            gridStatus.iters = 0;
            itersSpent -= itersRemaining;
            //this.juliaRem -= this.juliaData[gridStatus.progress];
          }
          this.juliaRem -= itersSpent;
        }
        gridStatus.lastTime = curTime;
        this.juliaMSRem = 1000 * this.juliaRem / this.rate;
        this.juliaPercent = 100 * (1 - this.juliaRem / this.juliaTotal);

        if (gridStatus.progress >= this.maxProgress) {
          //draw mandel
          if (this.level === -1) {
            //draw the mandel piece
            if (!this.showCompleteJulias) {
              this.webgl.resetTriangleIndexes();
              this.drawMandel(this.ctx, cx * 32, cy * 32, 32, 2);
              this.webgl.draw();
              this.ctx.drawImage(this.webgl.canvas, cx * 32, cy * 32, 32, 32, cx * 32, cy * 32, 32, 32);
            } else {
              //draw the julia
              this.webgl.resetTriangleIndexes();
              this.drawJuliaMini(this.ctx, 32, cx, cy, cr, ci, gridStatus);
              this.webgl.draw();
              this.ctx.drawImage(this.webgl.canvas, cx * 32, cy * 32, 32, 32, cx * 32, cy * 32, 32, 32);
            }
          } else {
            if (this.state.marker === this.level) {
              this.webgl.resetTriangleIndexes();
              const status = this.state.gridStatus[this.level];
              this.drawJulia(this.ctx, 0, 0, 1024, 2, cr, ci, status);
              this.webgl.draw();
              this.ctx.drawImage(this.webgl.canvas, 0, 0, 1024, 1024, 0, 0, 1024, 1024);
            }
          }
          this.state.setPoints += 1;
          //this.state.marker++;
          this.juliaData = undefined;
        } else {
          if (this.level !== -1 ) {
            if (this.state.marker === this.level) {
              //update big julia
              this.webgl.resetTriangleIndexes();
              const status = this.state.gridStatus[this.level];
              this.drawJulia(this.ctx, 0, 0, 1024, 2, cr, ci, status);
              this.webgl.draw();
              this.ctx.drawImage(this.webgl.canvas, 0, 0, 1024, 1024, 0, 0, 1024, 1024);
            }
          } else {
            //update small julia
            this.webgl.resetTriangleIndexes();
            this.drawJuliaMini(this.ctx, 32, cx, cy, cr, ci, gridStatus);
            this.webgl.draw();
            this.ctx.drawImage(this.webgl.canvas, cx * 32, cy * 32, 32, 32, cx * 32, cy * 32, 32, 32);
          }
        }

        
        //game win condition
        if (this.state.totalIters >= this.maxIter && this.state.endTime === undefined) {
          this.state.endTime = (new Date()).getTime();
          const playTime = this.state.endTime - this.state.gameStart;
          this.UI.winPlayTime.textContent = this.remainingToStr(playTime, true);
          this.showModal('winContainer');
          this.saveToStorage();
        }
        
      }
    }
  }

  gridClick(x, y) {
    console.log('grid click', x, y);

    if (this.level ===  -1) {
      //if we're showing the map
      
      const clickedLevel = x + 32 * y;
      
      if (clickedLevel === this.state.marker) {
        //if you clicked the active grid cell
        this.level = clickedLevel;
        const cr = this.lerp(-2, 1, x / 32);
        const ci = this.lerp(-1.5, 1.5, y / 32);

        const state = this.state.gridStatus[x + y * 32];
        this.webgl.resetTriangleIndexes();
        this.drawJulia(this.ctx, 0, 0, this.cmain.width, 2, cr, ci, state);
        this.webgl.draw();
        this.ctx.drawImage(this.webgl.canvas, 0, 0, 1024, 1024, 0, 0, 1024, 1024);
        app.UI.showMap.disabled = false;
      } else {
        //if you clicked a new grid cell
        console.log("CHANGE GRID");

        if (this.state.marker !== -1) {
          const px = this.state.marker % 32;
          const py = Math.floor(this.state.marker / 32);
          this.state.gridStatus[this.state.marker].lastTime = 0;
          this.ctx.strokeStyle = 'black';
          this.ctx.strokeRect(px * 32, py * 32, 32, 32);
        }

        this.ctx.strokeStyle = 'yellow';
        this.ctx.strokeRect(x * 32, y * 32, 32, 32);
        this.state.marker = clickedLevel;
        this.state.gridStatus[this.state.marker].lastTime = 0;
        this.juliaData = undefined;
      }
    } else {
      //return to the map
      this.showMap();
      app.UI.showMap.disabled = true;
    }
  }

  onclick(evt) {
    const rect = this.cmain.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const gx = Math.floor(x / 32);
    const gy = Math.floor(y / 32);
    this.gridClick(gx, gy);
    this.saveToStorage();
  }

  timeToObj(t) {
    const result = {};

    result.y = Math.floor(t / (365 * 24 * 60 * 60));
    t = t % (365 * 24 * 60 * 60);
    result.d = Math.floor(t / (24 * 60 * 60));
    t = t % (24 * 60 * 60);
    result.h = Math.floor(t / (60 * 60));
    t = t % (60 * 60);
    result.m = Math.floor(t / 60);
    t = t % 60;
    result.s = t;

    return result;
  }  

  remainingToStr(ms, full) {
    if (ms === Infinity) {
      return 'Infinity';
    }

    const timeObj = this.timeToObj(ms / 1000);

    if (full) {
      return `${timeObj.y}:${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}:${timeObj.s.toFixed(1).padStart(4,0)}`;
    }

    //if (timeObj.y > 0 || timeObj.d > 0 || timeObj.h > 0) {
      //return `${timeObj.y}:${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}`;
      return `${timeObj.y}:${timeObj.d.toString().padStart(3,0)}:${timeObj.h.toString().padStart(2,0)}:${timeObj.m.toString().padStart(2,0)}:${Math.ceil(timeObj.s).toString().padStart(2,0)}`;
    //} else {
      //return `${timeObj.m.toString().padStart(2,0)}:${timeObj.s.toFixed(1).padStart(4,0)}`;
    //  return `${timeObj.m.toString().padStart(2,0)}:${Math.ceil(timeObj.s).toString().padStart(2,0)}`;
    //}

  }  

  //this only handles info box updates
  draw() {
    const nbsp = '\u00a0';
    let playTime;
    if (this.state.endTime === undefined) {
      playTime = (new Date()).getTime() - this.state.gameStart;
    } else {
      playTime = this.state.endTime - this.state.gameStart;
    }
    this.UI.infoTotalPlayTime.innerText = this.remainingToStr(playTime, true);
    this.UI.infoPoints.innerText = this.state.setPoints;
    this.UI.infoRate.innerText = this.rate.toFixed(3) + ' iter / sec';

    this.UI.infoJuliaProgress.style.width = `${this.juliaPercent}%`;
    this.UI.infoJuliaProgress.innerHTML = nbsp + this.remainingToStr(this.juliaMSRem, true);
    this.UI.infoMandelProgress.style.width = `${this.mandelPercent}%`;
    this.UI.infoMandelProgress.innerText = nbsp + this.remainingToStr(this.mandelMSRem, true);

    window.requestAnimationFrame(() => this.draw());
  }
  
  showJuliaChange() {
    const checked = this.UI.checkShowJulia.checked;

    this.showCompleteJulias = checked;
    if (this.level === -1) {
      this.drawTopGrid();
    }
  }

  handleLateHowie() {
    if (this.level === -1) {
      this.drawTopGrid();
    }
  }

  handleLateJulia() {
    if (this.level !== -1) {
      const cx = this.state.marker % 32;
      const cy = Math.floor(this.state.marker / 32);
      const cr = this.lerp(-2, 1, cx / 32);
      const ci = this.lerp(-1.5, 1.5, cy / 32);
      const status = this.state.gridStatus[this.level];
      this.drawJulia(this.ctx, 0, 0, 1024, 2, cr, ci, status);
      this.webgl.draw();
      this.ctx.drawImage(this.webgl.canvas, 0, 0, 1024, 1024, 0, 0, 1024, 1024);
    }
  }
}

const app = new App();


/*
Below is pieroxy's LZString and license
*/

/*
MIT License

Copyright (c) 2013 pieroxy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString});




'use strict';

/*
  first canvas is a grid of blocks
  to complete each one you must complete the related julia set
  each pixel in the julia set takes a time proportional to the bail out iterations
  when you find pixels in the julia set you get points you can use to increase
    your speed
  you apply effort to mandel squares by allocating your julia set points
  you start out with 1 julia set point to allocate
  you must also get some points for completing a julia set because otherwise
    there are a lot of julia sets that probably will have 0 pixels in the set
  need to pre-calculate all the data because floating point calculations might
    not be the same on all devices

  TODO:
  add import/export
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

    this.level = -1;
    this.initUI();


    this.drawTopGrid();


    const tickInterval = 1000 / 30;
    setInterval(() => this.tick(), tickInterval);
    setInterval(() => this.saveToStorage(), 5000);

    if (this.firstLoad) {
      this.showModal('helpContainer');
    }
  }

  loadFromStorage() {
    const rawState = localStorage.getItem(this.storageKey);

    this.state = {
      setPoints: 0,
      gridStatus: []
    };

    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        const grid = {
          banked: 0,
          progress: 0,
          startTime: 0
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

  initUI() {
    this.UI = {};

    //get all the elements from the static HTML
    const namedElements = document.querySelectorAll('*[id]');
    for (let i = 0; i < namedElements.length; i++) {
      const namedElement = namedElements.item(i);
      this.UI[namedElement.id] = namedElement;
    }

    this.UI.reset.onclick = () => this.showModal('resetConfirm');
    this.UI.resetYes.onclick = () => this.reset();
    this.UI.resetNo.onclick = () => this.closeModal('resetConfirm');
    this.UI.helpClose.onclick = () => this.closeModal('helpContainer');

    this.cmain.onclick = (evt) => this.onclick(evt);
    this.UI.showMap.onclick = () => this.showMap();
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
  }

  drawTopGrid() {
    const size = 32;
    const w = this.cmain.width / size;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < w; y++) {
        const state = this.state.gridStatus[x + y * w];
        if (state.progress === 0) {
          const cr = this.lerp(-2, 1, x / w);
          const ci = this.lerp(-1.5, 1.5, y / w);
          this.drawJuliaMini(this.ctx, size, x, y, cr, ci, state);
        } else {
          this.drawMandel(this.ctx, x * size, y * size, size, 2);
        }
        this.ctx.strokeRect(x * size, y * size, size, size);
      }
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

  drawMandel(ctx, locx, locy, size, step) {
    for (let cx = locx; cx < locx + size; cx += step) {
      for (let cy = locy; cy < locy + size; cy += step) {
        const x = this.lerp(-2, 1, cx / ctx.canvas.width);
        const y = this.lerp(-1.5, 1.5, cy / ctx.canvas.width);
        const val = this.getMandel(x, y, 100);
        ctx.fillStyle = `hsl(${val * 360 / 100}, 50%, ${val === 0 ? 0 : 50}%)`;
        ctx.fillRect(cx, cy, size, size);
      }
    }
  }

  drawJuliaMini(ctx, size, xi, yi, cr, ci, state) {
    this.drawJulia(ctx, xi * size, yi * size, size, 2, cr, ci, state);  
    ctx.strokeRect(xi * size, yi * size, size, size);
  }

  drawJulia(ctx, locx, locy, size, step, cr, ci, state) {
    ctx.save();
    ctx.translate(locx, locy);
    for (let cy = 0; cy < size; cy += step) {
      for (let cx = 0; cx < size; cx += step) {
        const f = (cy * size + cx) / (size * size);
        const x = this.lerp(-2, 2, cx / size);
        const y = this.lerp(-2, 2, cy / size);
        const val = this.getJulia(x, y, cr, ci, 100);
        if (state.progress > f || true) {
          ctx.fillStyle = `hsl(${val * 360 / 100}, 50%, ${val === 0 ? 0 : 50}%)`;
        } else {
          ctx.fillStyle = `hsl(0, 0%, 50%)`;
        }
        ctx.fillRect(cx, cy, step, step);
      }
    }
    ctx.restore();
  }

  tick() {
  }

  gridClick(x, y) {
    console.log('grid click', x, y);

    if (this.level ===  -1) {
      this.level = x + 32 * y;
      const cr = this.lerp(-2, 1, x / 32);
      const ci = this.lerp(-1.5, 1.5, y / 32);

      const state = this.state.gridStatus[x + y * 32];
      this.drawJulia(this.ctx, 0, 0, this.cmain.width, 2, cr, ci, state);

    }
  }

  onclick(evt) {
    const rect = this.cmain.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const gx = Math.floor(x / 32);
    const gy = Math.floor(y / 32);
    this.gridClick(gx, gy);
  }
}

const app = new App();

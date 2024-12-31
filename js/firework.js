// 焰火集合类，用于管理多个焰火实例的创建、渲染和动画控制
class Fireworks {
  // 私有属性：定时器，用于控制焰火爆炸的时间间隔
  _timer = null;
  // 私有属性：动画帧控制器，用于控制动画的连续播放
  _animater = null;
  // 是否使用 requestAnimationFrame 进行动画更新，默认为 true
  _useAnimationFrame = true;

  // 画布上下文，所有绘制操作都在这里进行
  ctx = null;
  // 离屏 canvas 上下文，用于性能优化，减少主画布上的绘图操作次数
  offScreenCtx = null;
  // 每秒最大帧数（Frames Per Second），用于控制动画流畅度
  fps = 60;
  // 存储当前活跃的焰火实例数组
  fireworks = [];
  // 每次循环中创建的焰火数量
  fireworkCount = 8;
  // 焰火爆炸之间的最小时间间隔（毫秒）
  fireworkInterval = 400;
  // 颜色数组，用于随机选择焰火的颜色
  fireworkColors = DEFAULT_COLORS; // 注意: 默认颜色数组需要预先定义

  // 粒子配置对象，包含粒子的各种属性
  particleOptions = {
    size: 15, // 粒子的初始大小
    speed: 15, // 粒子的速度
    gravity: 0.08, // 地球引力对粒子的影响
    power: 0.93, // 粒子运动的动力衰减系数
    shrink: 0.97, // 粒子尺寸随时间缩小的比例
    jitter: 1, // 粒子位置的随机抖动量
    color: 'hsla(210, 100%, 50%, 1)', // 粒子颜色
  };

  // 构造函数，初始化时接收一个 DOM 元素作为容器，并可选地接受配置选项
  constructor(dom, options = {}) {
    // 如果传入的第一个参数不是 HTMLElement，则认为它是配置选项对象
    if (!(dom instanceof HTMLElement)) {
      options = dom || {};
    }

    // 如果没有提供有效的 DOM 容器，则默认使用 document.body
    if (!dom) {
      dom = document.body;
    }

    // 初始化 Canvas 和相关的上下文
    this.initCanvas(dom);

    // 解构赋值，分离出粒子配置和其他配置项
    const { particleOptions = {}, ...others } = options;
    // 合并默认粒子配置与用户自定义的粒子配置
    this.particleOptions = { ...this.particleOptions, ...particleOptions };
    // 将其他配置项应用到实例属性上
    Object.keys(others).forEach(key => this[key] = others[key]);

    // 根据帧率设置是否使用 requestAnimationFrame
    this._useAnimationFrame = this.fps >= 60;
  }

  // 初始化 Canvas 方法，根据传入的 DOM 容器创建或调整 Canvas 大小
  initCanvas(dom) {
    let canvas = dom;

    // 判断传入的元素是否已经是 Canvas
    const isCanvas = canvas.nodeName.toLowerCase() === 'canvas';
    if (!isCanvas) {
      // 如果不是 Canvas，则创建一个新的 Canvas 并添加到容器中
      canvas = document.createElement('canvas');
      dom.appendChild(canvas);
    }

    // 获取容器的实际宽度和高度，并设置给 Canvas
    const { width, height } = dom.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    // 设置 Canvas 的样式，确保它在页面上正确显示
    canvas.style.cssText = `width: ${width}px; height: ${height}px;`;

    // 获取 Canvas 的 2D 绘图上下文
    this.ctx = canvas.getContext('2d');

    // 创建离屏 Canvas，克隆现有 Canvas 并获取其上下文
    const offScreenCanvas = canvas.cloneNode();
    this.offScreenCtx = offScreenCanvas.getContext('2d');
  }

  // 创建单个焰火的方法，可以选择指定焰火的位置和颜色
  createFirework(x, y, color) {
    const { ctx, particleOptions, fireworkColors } = this;
    const { width, height } = ctx.canvas;

    // 如果没有提供 x, y 或 color 参数，则随机生成
    x = x ?? random(width * 0.1, width * 0.9);
    y = y ?? random(height * 0.1, height * 0.9);
    color = color ?? random(fireworkColors);
    const particleCount = random(80, 100); // 随机生成粒子数量

    // 创建新的焰火实例，并添加到火焰花列表中
    const firework = new Firework({ particleOptions, particleCount, x, y, color });
    this.fireworks.push(firework);
  }

  // 检查并移除已经燃尽的焰火
  checkFireworks() {
    this.fireworks = this.fireworks.filter(firework => !firework.isBurnOff());
  }

  // 循环方法，负责按一定间隔创建新焰火，并检查现有焰火状态
  loop() {
    let interval = this.fireworkInterval * random(0.5, 1); // 随机化间隔时间
    this._timer = setTimeout(() => {
      this.checkFireworks(); // 清理已燃尽的焰火

      // 如果当前焰火数量少于设定的数量，则创建新的焰火
      if (this.fireworks.length < this.fireworkCount) {
        this.createFirework();
      }

      // 递归调用自身以维持循环
      this.loop();
    }, interval);
  }

  // 渲染方法，负责绘制所有的焰火及其粒子
  render(animationFunction, interval) {
    this._animater = animationFunction(() => {
      const { width, height } = this.ctx.canvas;

      // 在每次渲染前，在整个画布上绘制一层半透明的黑色，模拟尾焰效果
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      this.ctx.fillRect(0, 0, width, height);

      // 清空离屏 Canvas
      this.offScreenCtx.clearRect(0, 0, width, height);

      // 更新每个焰火的状态，并将其绘制到离屏 Canvas 上
      this.fireworks.forEach(firework => {
        firework.render(this.offScreenCtx);
      });

      // 保存当前的绘图状态
      this.ctx.save();
      // 使用 lighter 模式将离屏 Canvas 的内容合并到主画布上，增强亮度
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.drawImage(this.offScreenCtx.canvas, 0, 0, width, height);
      // 恢复之前的绘图状态
      this.ctx.restore();

      // 递归调用自身以维持渲染循环
      this.render(animationFunction, interval);
    }, interval);
  }

  // 开始方法，启动焰火创建和渲染循环
  start() {
    this.loop(); // 启动焰火创建循环

    // 根据帧率选择使用 requestAnimationFrame 或 setTimeout 来控制动画
    const animationFunction = this._useAnimationFrame ? requestAnimationFrame : setTimeout;
    const interval = 16.67 * (60 / this.fps); // 计算每次动画调用的时间间隔
    this.render(animationFunction, interval); // 启动渲染循环
  }

  // 暂停方法，停止创建新焰火和渲染循环
  pause() {
    this._timer && clearTimeout(this._timer); // 停止焰火创建定时器
    this._animater && (this._useAnimationFrame ? cancelAnimationFrame(this._animater)
      : clearTimeout(this._animater)); // 停止动画帧控制器

    this._timer = null;
    this._animater = null;
  }

  // 结束方法，清理所有资源并重置状态
  stop() {
    this.pause(); // 调用暂停方法停止所有活动

    // 清空所有焰火实例
    this.fireworks.length = 0;

    // 清空主画布
    const { width, height } = this.ctx.canvas;
    this.ctx.clearRect(0, 0, width, height);
  }
}

// 单个焰火类，代表一个具体的焰火实例
class Firework {
  // 焰火状态枚举，可能需要在外部定义 STATUS 对象
  _status = STATUS.INIT;

  // 焰火的中心坐标
  x = 0;
  y = 0;

  // 焰火的颜色
  color = 'rgba(255, 255, 255, 1)';
  // 粒子数量
  particleCount = 80;
  // 粒子数组，存储所有粒子实例
  particles = [];
  // 粒子配置对象
  particleOptions = {};

  // 构造函数，初始化时接收配置选项
  constructor(options = {}) {
    Object.keys(options).forEach(key => this[key] = options[key]);
    this._status = STATUS.INIT;

    this.initParticles(); // 初始化粒子
  }

  // 初始化粒子方法，根据配置创建指定数量的粒子
  initParticles() {
    const { x, y, color, particleOptions } = this;
    const { size: baseSize } = particleOptions;

    for (let index = 0; index < this.particleCount; index++) {
      const size = random(-baseSize / 2, baseSize / 2) + baseSize;
      const particle = new Particle({ ...particleOptions, x, y, size, color });
      this.particles.push(particle);
    }
  }

  // 更新粒子状态，处理粒子的移动和消亡逻辑
  updateParticles() {
    this.particles.forEach(particle => particle.update());

    // 移除已经燃尽的粒子
    this.particles = this.particles.filter(particle => !particle.isBurnOff());

    // 如果所有粒子都燃尽了，则标记焰火为完成
    if (this.particles.length === 0) {
      this._status = STATUS.COMPLETED;
    }
  }

  // 渲染方法，负责绘制所有粒子
  render(ctx) {
    this.updateParticles(); // 更新粒子状态
    if (this.isBurnOff()) return; // 如果焰火已经燃尽则不再绘制

    this.particles.forEach(particle => {
      particle.render(ctx); // 绘制每个粒子
    });
  }

  // 检查焰火是否已经燃尽
  isBurnOff() {
    return this._status === STATUS.COMPLETED;
  }
}

// 粒子类，代表焰火中的每一个粒子
class Particle {
  // 粒子的各种属性
  size = 10;
  speed = 15;
  gravity = 0.2;
  power = 0.92;
  shrink = 0.93;
  jitter = 0.08;
  color = 'hsla(210, 100%, 50%, 1)';
  shadowColor = 'hsla(210, 100%, 50%, 0.1)';

  // 粒子的初始位置坐标
  x = 0;
  y = 0;

  // 粒子的速度向量
  vel = {
    x: 0,
    y: 0,
  };

  // 构造函数，初始化时接收配置选项
  constructor(options) {
    Object.keys(options).forEach(key => {
      this[key] = options[key];
    });
    const angle = random(0, Math.PI * 2); // 随机角度
    const speed = Math.cos(random(0, Math.PI / 2)) * this.speed; // 随机速度
    this.vel = {
      x: Math.cos(angle) * speed, // 计算 X 方向的速度分量
      y: Math.sin(angle) * speed, // 计算 Y 方向的速度分量
    };
    this.shadowColor = tinycolor(this.color).setAlpha(0.1); // 注意: 使用了 tinycolor 库来调整颜色透明度
  }

  // 更新方法，计算粒子的新位置和状态
  update() {
    this.vel.x *= this.power; // 应用动力衰减到 X 方向的速度
    this.vel.y *= this.power; // 应用动力衰减到 Y 方向的速度

    this.vel.y += this.gravity; // 应用地心引力到 Y 方向的速度

    const jitter = random(-1, 1) * this.jitter; // 添加一些随机抖动
    this.x += this.vel.x + jitter; // 更新 X 坐标
    this.y += this.vel.y + jitter; // 更新 Y 坐标

    this.size *= this.shrink; // 缩小粒子尺寸
  }

  // 渲染方法，负责绘制单个粒子
  render(ctx) {
    if (this.isBurnOff()) return; // 如果粒子已经燃尽则不绘制

    ctx.save(); // 保存当前绘图状态

    const { x, y, size, color, shadowColor } = this;
    // 创建径向渐变效果
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.6, color);
    gradient.addColorStop(1, shadowColor);

    ctx.fillStyle = gradient; // 设置填充样式为渐变

    // 绘制矩形代替圆形，因为矩形绘制性能更好
    ctx.fillRect(x, y, size, size);

    ctx.restore(); // 恢复之前的绘图状态
  }

  // 检查粒子是否已经燃尽
  isBurnOff() {
    return this.size < 1;
  }
}
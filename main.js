const canvas = document.getElementById('carCanvas');
const networkCanvas = document.getElementById('networkCanvas');

const params = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
console.log(params.N);

canvas.width = 200;
networkCanvas.width = 300;

const ctx = canvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');
const road = new Road(canvas.width / 2, canvas.width * 0.9);
const N = params.N || 1000;
const learningRate = params.learningRate ? params.learningRate/ 100  :  0.1;
let cars = generateCars(N);

let frames = 0;

let render = true;
let traffic = [
  new Car(road.getLaneCenter(1), -100, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(0), -300, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(2), -300, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(2), -500, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(1), -500, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(2), -600, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(0), -700, 30, 50, 'DUMMY', 4),
  new Car(road.getLaneCenter(0), -700, 30, 50, 'DUMMY', 4),
];
let bestCar = cars[0];
let originalbestCar = null;

if (localStorage.getItem('bestBrain')) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
    if (i != 0) {
      NeuralNetwork.mutate(cars[i].brain, Math.random() * learningRate * 2);
    } else {
      originalbestCar = bestCar;
    }
  }
}
let trainedBrain = '{"levels":[{"inputs":[0.21640085230944794,0,0,0,0.5108069415547665],"outputs":[0,1,1,1,1,1],"biases":[-0.010587537555732742,-0.10355943066910073,-0.22544714275456246,-0.2733379916377606,-0.11835361997769059,-0.19586057907555066],"weights":[[0.37406512629511773,-0.1391020491695886,0.21335101068036194,0.2591317715148177,-0.14792817091667884,0.15912310672605232],[0.35503920863221156,-0.1958493171670612,0.38146189461945834,0.2945161606185253,0.38237580673722144,0.3299339691392338],[-0.1627094489190284,-0.2574106850049324,-0.3514629840123814,-0.3403861052190712,0.08498264027810344,0.29864824236847703],[-0.39182487028500457,-0.29713771024872593,-0.4149974394633037,0.30489020848927595,0.3472069801394774,-0.37339389339333484],[-0.436023835917065,0.07611843476855637,-0.4110629132410455,-0.19487419705736686,0.09617777424413411,0.04667994907351951]]},{"inputs":[0,1,1,1,1,1],"outputs":[1,1,1,0],"biases":[-0.14542091292506554,-0.6137978683367384,0.04880009325605403,0.2783929536255424],"weights":[[-0.45607634893928756,-0.15216615605944636,0.5239955473453685,0.1339939160110648],[-0.12971639859149248,0.045324901736579035,0.19410432171182232,-0.3777743301697161],[0.32942247943461217,-0.35497783528606547,0.29448224620791225,-0.026059497275002834],[-0.3116653434742561,0.16587159700766865,0.08768086943452563,-0.2474358033499568],[0.29609148398332163,0.023852192884960238,-0.29449955903744496,-0.21285560548107046],[0.7189363165751741,-0.32027278111352314,-0.09439354200313663,0.5394945785124748]]}]}';
function setTrainedBrain() {
  localStorage.setItem('bestBrain', trainedBrain);
  location.reload();
}

function updateTraffic() {
  traffic = traffic.filter(car => (car.y - bestCar.y) <= 1000);
  if (!bestCar.damaged)
  cars = cars.filter(car => (car.y - bestCar.y) <= 1000 || car == originalbestCar);

  nextCarY = Math.min(...traffic.map(car => car.y)) - 100;

  while (nextCarY > bestCar.y - 1500) {
    const mask = Math.floor(Math.random() * 8);
    nextCarY -= 150;
    if (mask == 7) continue;
    for (let i = 0; i < 3; i++) {
      if (mask & (1 << i)) {
        traffic.push(
            new Car(road.getLaneCenter(i), nextCarY, 30, 50, 'DUMMY', 4));
      }
    }
    break;
  }
  // console.log(traffic.length, cars.length);
}


function save() {
  localStorage.setItem('bestBrain', JSON.stringify(bestCar.brain));
}

function discard() {
  localStorage.removeItem('bestBrain');
}

function generateCars(N) {
  const cars = [];
  for (let i = 1; i <= N; i++) {
    cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, 'AI'));
  }
  return cars;
}

function toggleRender() {
  render = !render;
}


function animate(time) {
  frames++;
  if (frames % 50 == 0) {
    console.log(frames, Math.round(-bestCar.y), cars.length, originalbestCar?.damaged);
  }
  updateTraffic();
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders, []);
  }
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders, traffic);
  }
  bestCar = cars.find(c => c.y == Math.min(...cars.map(c => c.y)));
  canvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;
  if (render) {
    ctx.save();
    ctx.translate(0, -bestCar.y + canvas.height * 0.7);
    road.draw(ctx);
    for (let i = 0; i < traffic.length; i++) {
      traffic[i].draw(ctx, 'red');
    }

    ctx.globalAlpha = 0.2;
    for (let i = 0; i < cars.length; i++) {
      cars[i].draw(ctx, 'blue');
    }
    ctx.globalAlpha = 1;
    if (originalbestCar) originalbestCar.draw(ctx, 'green', false);
    bestCar.draw(ctx, 'blue', true);

    networkCtx.lineDashOffset = time / 50;
    Visualizer.drawNetwork(networkCtx, bestCar.brain);
    ctx.restore();
    ctx.font = 15 + 'px Arial';
    ctx.fillText('Score', 15, 15);
    ctx.fillText(Math.round(-bestCar.y + 100), 15, 30);
    ctx.fillText('Lives', 85, 15);
    ctx.fillText(cars.filter(car => !car.damaged).length, 85, 30);
  }
  if (render) {
    requestAnimationFrame(animate);
  }
  else {
    setTimeout(animate, 0);
  }
}


animate();
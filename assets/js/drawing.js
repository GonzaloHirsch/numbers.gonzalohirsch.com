// Drawing variables
let canvas, ctx, infoText, btnClear, btnPredict, flag = false, prevX = 0, currX = 0, prevY = 0, currY = 0, dot_flag = false, w, h;
const STROKE_STYLE = "black", STROKE_WIDTH = 16, TARGET_WIDTH = 28, TARGET_HEIGHT = 28;

// API variables
const API_URL = "https://api.numbers.gonzalohirsch.com/predict";

const init = () => {
    canvas = document.getElementById('can');
    infoText = document.getElementById('info-text');
    btnClear = document.getElementById('clear-btn');
    btnPredict = document.getElementById('predict-btn');
    ctx = canvas.getContext("2d");
    w = canvas.width;
    h = canvas.height;

    // Listeners for the mouse event
    canvas.addEventListener("mousemove", (e) => findxy('move', e), false);
    canvas.addEventListener("mousedown", (e) => findxy('down', e), false);
    canvas.addEventListener("mouseup", (e) => findxy('up', e), false);
    canvas.addEventListener("mouseout", (e) => findxy('out', e), false);

    // Listeners for mobile touch event
    canvas.addEventListener('touchstart', (e) => findxy('down', e.touches[0]), false);
    canvas.addEventListener('touchmove', (e) => {
        findxy('move', e.touches[0]); e.preventDefault();
    }, false);
    canvas.addEventListener('touchend', (e) => findxy('up', e.changedTouches[0]), false);

    // Set info text hidden
    hideInfoText();
}

const draw = () => {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.lineCap = 'round';
    ctx.strokeStyle = STROKE_STYLE;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.stroke();
    ctx.closePath();
}

const clearDrawing = () => {
    hideInfoText();
    ctx.clearRect(0, 0, w, h);
}

// Handles the prediction of the drawing
const predictDrawing = async () => {
    showInfoText("Predicting...");

    setButtonState(false);

    // Get the pixels
    const pixels = getPixelBuffer();

    // Send the pixels as POST to the API
    const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: pixels
        })
    }).then(res => res.json());

    // Get the best result
    const result = findBestResult(response.result);

    // Show the result
    showInfoText(`The model predicted the number to be a <u>${result[0]}</u> with <u>${toFixed(result[1], 2)}%</u> confidence.`);

    setButtonState(true);
}

const getPixelBuffer = () => {
    // Get the buffer with the data and keep only the alpha values
    const bufferArr = new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data.buffer);
    const rawPixels = [];
    for (let i = 3; i < bufferArr.length; i += 4) rawPixels.push(bufferArr[i]);
    // Take only the alpha and map to 1, join every X numbers
    const groupW = w / TARGET_WIDTH, groupH = h / TARGET_HEIGHT;
    const pixels = [];
    // Iterate all the target pixels
    for (let i = 0; i < TARGET_WIDTH; i++) {
        for (let j = 0; j < TARGET_HEIGHT; j++) {
            // Get the groupW and groupH pixels
            let max = 0;
            for (let buffI = groupW * i; buffI < groupW * (i + 1); buffI++) {
                for (let buffJ = groupH * j; buffJ < groupH * (j + 1); buffJ++) {
                    max = Math.max(max, rawPixels[buffI * w + buffJ])
                }
            }
            pixels.push(max / 255);
        }
    }
    return pixels;
}

const findxy = (res, e) => {
    if (res == 'down') {
        computePosition(e);
        flag = true;
        ctx.beginPath();
        ctx.fillStyle = STROKE_STYLE;
        ctx.fillRect(currX, currY, 2, 2);
        ctx.closePath();
    }
    if (res == 'up' || res == "out") flag = false;
    if (res == 'move' && flag) {
        computePosition(e);
        draw();
    }
}

const computePosition = (e) => {
    prevX = currX;
    prevY = currY;
    const rect = e.target.getBoundingClientRect();
    currX = e.clientX - rect.left;
    currY = e.clientY - rect.top;
}

// ####################################################################################
// RESULT DISPLAYING
// ####################################################################################

const hideInfoText = () => {
    infoText.style.display = 'none';
};

const showInfoText = (text) => {
    infoText.innerHTML = text;
    infoText.style.display = 'block';
};

const findBestResult = (results) => {
    let maxKey = "0";
    // Compute maximum key
    Object.keys(results).forEach(key => {
        if (results[key] > results[maxKey]) maxKey = key;
    });
    // Return the key and confidence score
    return [maxKey, results[maxKey] * 100];
}

function toFixed(num, fixed) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
    return num.toString().match(re)[0];
}

// ####################################################################################
// BUTTON HANDLING
// ####################################################################################

const setButtonState = (enabled) => {
    btnClear.disabled = !enabled;
    btnPredict.disabled = !enabled;
}
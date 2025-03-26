const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
let source, masterGain, currentStream;
let gainNode, distortion, delay, reverb;
let preGain, bassFilter, midFilter, trebleFilter;

// 🎛️ Initialize audio effects
function createEffects() {
    // Basic effects
    gainNode = audioCtx.createGain();
    distortion = audioCtx.createWaveShaper();
    delay = audioCtx.createDelay();
    reverb = audioCtx.createGain();
    masterGain = audioCtx.createGain();

    // EQ effects
    preGain = audioCtx.createGain();
    bassFilter = audioCtx.createBiquadFilter();
    midFilter = audioCtx.createBiquadFilter();
    trebleFilter = audioCtx.createBiquadFilter();

    // Initialize basic effects
    gainNode.gain.value = 1;
    masterGain.gain.value = 1;
    distortion.curve = makeDistortionCurve(0);
    distortion.oversample = '4x';
    delay.delayTime.value = 0;
    reverb.gain.value = 0;

    // Initialize EQ
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    bassFilter.gain.value = 0;

    midFilter.type = 'peaking';
    midFilter.frequency.value = 1500;
    midFilter.Q.value = 1;
    midFilter.gain.value = 0;

    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 3000;
    trebleFilter.gain.value = 0;

    preGain.gain.value = 1;
}

// 📈 Generate distortion curve
function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; ++i) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

// 🎚️ Update effects based on slider input
function updateEffects() {
    // Get basic effect values
    let distortionIntensity = document.getElementById('distortion')?.value || 0;
    let delayIntensity = document.getElementById('delay')?.value || 0;
    let volumeIntensity = document.getElementById('volume')?.value || 0;
    let reverbIntensity = document.getElementById('reverb')?.value || 0;
    let gainValue = document.getElementById('gain')?.value || 50;

    // Get EQ values
    let bassValue = document.getElementById('bass')?.value || 50;
    let midValue = document.getElementById('mid')?.value || 50;
    let trebleValue = document.getElementById('treble')?.value || 50;

    // Update basic effects
    distortion.curve = makeDistortionCurve(distortionIntensity);
    delay.delayTime.value = (delayIntensity / 1000);
    reverb.gain.value = reverbIntensity / 100;
    gainNode.gain.value = volumeIntensity / 100;
    preGain.gain.value = (gainValue / 50) * 2;

    // Update EQ effects
    bassFilter.gain.value = ((bassValue - 50) / 50) * 15;
    midFilter.gain.value = ((midValue - 50) / 50) * 15;
    trebleFilter.gain.value = ((trebleValue - 50) / 50) * 15;

    // Update visuals
    updateKnobVisual('distortion', distortionIntensity);
    updateKnobVisual('delay', delayIntensity);
    updateKnobVisual('reverb', reverbIntensity);
    updateKnobVisual('volume', volumeIntensity);
    updateKnobVisual('gain', gainValue);
    updateKnobVisual('bass', bassValue);
    updateKnobVisual('mid', midValue);
    updateKnobVisual('treble', trebleValue);
}
// 🎨 Update Knob UI Visuals
function updateKnobVisual(knobId, value) {
    let knob = document.getElementById(knobId);
    if (knob) {
        let percentage = (value / knob.max) * 100;
        knob.style.background = `linear-gradient(to right, #a64dff ${percentage}%, #440066 ${percentage}%)`;
    }
}

// 🎛️ Set up audio chain
async function setAudioChain() {
    let micDevice = document.getElementById('inputDevice')?.value;

    let micConstraints = {
        audio: {
            deviceId: micDevice ? { exact: micDevice } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    };

    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        currentStream = micStream;
        await setupAudioChain();
    } catch (error) {
        console.error("Audio setup error:", error);
    }
}

// 🔄 Connect effects & audio processing
async function setupAudioChain() {
    if (!currentStream) {
        console.error("No audio source available");
        return;
    }

    try {
        if (masterGain) masterGain.disconnect();

        source = audioCtx.createMediaStreamSource(currentStream);
        createEffects();

        // Connect the complete audio chain
        source.connect(preGain);
        preGain.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(gainNode);
        gainNode.connect(distortion);
        distortion.connect(delay);
        delay.connect(reverb);
        reverb.connect(masterGain);
        
        const outputDevice = document.getElementById('outputDevice')?.value;
        if (outputDevice && audioCtx.setSinkId) {
            try {
                await audioCtx.setSinkId(outputDevice);
            } catch (err) {
                console.warn("Failed to set audio output device:", err);
            }
        }

        masterGain.connect(audioCtx.destination);
        updateEffects();
        
        if (audioCtx.state !== 'running') {
            await audioCtx.resume();
        }
    } catch (error) {
        console.error("Error in setupAudioChain:", error);
    }
}

// 🎤🎧 Fetch available audio devices
async function getAudioDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputDevices = devices.filter(device => device.kind === 'audioinput');
    const outputDevices = devices.filter(device => device.kind === 'audiooutput');

    const deviceContainer = document.createElement('div');
    deviceContainer.style.display = 'flex';
    deviceContainer.style.alignItems = 'center';
    deviceContainer.style.gap = '15px';
    deviceContainer.style.padding = '10px';
    deviceContainer.style.background = '#33004d';
    deviceContainer.style.borderRadius = '8px';
    deviceContainer.style.marginBottom = '15px';

    const createDeviceSelector = (label, id, devices) => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';

        const labelElem = document.createElement('label');
        labelElem.textContent = label;
        labelElem.style.color = '#e0b3ff';
        labelElem.style.marginRight = '8px';

        const select = document.createElement('select');
        select.id = id;
        styleDropdown(select);

        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `${label} ${index + 1}`;
            select.appendChild(option);
        });

        wrapper.appendChild(labelElem);
        wrapper.appendChild(select);
        return { wrapper, select };
    };

    const input = createDeviceSelector('Mic:', 'inputDevice', inputDevices);
    const output = createDeviceSelector('Speaker:', 'outputDevice', outputDevices);

    deviceContainer.appendChild(input.wrapper);
    deviceContainer.appendChild(output.wrapper);
    document.body.prepend(deviceContainer);

    input.select.addEventListener('change', handleDeviceChange);
    output.select.addEventListener('change', handleDeviceChange);
}

// 🎨 Style dropdown menus
function styleDropdown(dropdown) {
    Object.assign(dropdown.style, {
        background: '#440066',
        color: '#e0b3ff',
        border: '2px solid #a64dff',
        padding: '5px 10px',
        borderRadius: '5px',
        cursor: 'pointer',
        minWidth: '120px'
    });
}

// 🔄 Handle device changes
async function handleDeviceChange() {
    try {
        await setAudioChain();
    } catch (error) {
        console.error("Error changing device:", error);
    }
}

// 🚀 Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    await getAudioDevices();
    
    setTimeout(async () => {
        if (document.getElementById('inputDevice')) {
            await setAudioChain();
            // Keep audio context always running
            setInterval(() => {
                if (audioCtx.state !== 'running') {
                    audioCtx.resume().catch(console.error);
                }
            }, 500);
        }
    }, 1000);

    // Apply real-time updates for all effect sliders
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', updateEffects);
    });
});
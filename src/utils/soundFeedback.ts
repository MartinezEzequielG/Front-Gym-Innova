const successSound = new Audio('/sounds/success.mp3');
const errorSound = new Audio('/sounds/error.mp3');

export function playSuccess() {
  successSound.currentTime = 0;
  successSound.play().catch(() => {});
}

export function playError() {
  errorSound.currentTime = 0;
  errorSound.play().catch(() => {});
}
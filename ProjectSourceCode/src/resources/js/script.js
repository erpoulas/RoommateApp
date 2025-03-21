console.log('script.js loaded');

function setTheme(theme)
{
    const body = document.body;
    if (theme === 'Light') 
    {
      body.setAttribute('data-bs-theme', 'light');
    } 
    else if (theme === 'Dark') 
    {
      body.setAttribute('data-bs-theme', 'dark');
    }

    // local storage allows you to save stuff so im saving the theme into localstorage
    localStorage.setItem('theme', theme);
}

// this function loads and applys the theme that was selected to a page when its loaded
function loadTheme() 
{
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) 
    {
      setTheme(savedTheme);
    }
}

// you have to call the loadTheme function whenever scrtip.js is loaded so the theme will apply to each page
loadTheme();
console.log('load theme called');


// function updateHangmanImage(errorCount) {
//     const image = document.getElementById('hangman-image');
//     // Update the image source based on the error count
//     image.src = `img/hangman-${errorCount}.svg`;
//     console.log('Updated hangman image to:', image.src);
//   }
// // initialize the game when the page loads

// document.addEventListener('DOMContentLoaded', function () {
//   // Check if the current page is the "playgame" page (by URL or a unique element)
//   if (window.location.pathname.includes("playHangman")) {
//     document.addEventListener('keydown', function (event) {
//       const letter = event.key.toUpperCase(); // Get the pressed key and convert it to uppercase

//       // Check if the key is a valid letter (A-Z)
//       if (letter >= 'A' && letter <= 'Z') {
//         // Find the corresponding button for the letter
//         const button = document.querySelector(`button[onclick="checkGuess('${letter}', this)"]`);
//         if (button) {
//           checkGuess(letter, button); // Call the checkGuess function with the guessed letter
//         }
//       }
//       loadTheme(); // Might change **
//       console.log('load theme called into event listener');
//     });
//   }
//   initializeGame(); // Call initializeGame to set up the initial game state
// });

//By using DOMContentLoaded, the code ensures that all elements needed for the game (like buttons, displays, or hidden elements) are available before trying to manipulate them.
//Without this, the initializeGame() function might run too early, causing errors if the DOM isn't fully loaded yet

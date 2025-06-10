const recipeList = document.getElementById('recipeList');
const recipeModal = document.getElementById('recipeModal');
const recipeDetails = document.getElementById('recipeDetails');
const closeBtn = document.querySelector('.closeBtn');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const randomBtn = document.getElementById('randomBtn'); // Make sure this button is in your HTML
const dietSelect = document.getElementById('dietSelect');
const cuisineSelect = document.getElementById('cuisineSelect');

// Load default recipes
window.addEventListener('DOMContentLoaded', () => {
  fetchRecipes("chicken");
});

// Fetch recipes from TheMealDB
async function fetchRecipes(query) {
  recipeList.innerHTML = '<p>Loading...</p>';
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.meals) {
      recipeList.innerHTML = '<p>No recipes found.</p>';
    } else {
      displayRecipes(data.meals);
    }
  } catch (error) {
    recipeList.innerHTML = '<p>Error fetching recipes.</p>';
    console.error(error);
  }
}

// Show recipe cards
function displayRecipes(recipes) {
  
  const sortOrder = document.getElementById('sortSelect').value;
  if (sortOrder) {
    recipes = sortRecipesAlphabetically(recipes, sortOrder);
  }

  recipeList.innerHTML = '';
  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.classList.add('recipe-card');
    card.innerHTML = `
  <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
  <h3>${recipe.strMeal}</h3>
  <button onclick="getRecipeDetails('${recipe.idMeal}')">View Details</button>
  <button onclick="addToFavorites('${recipe.idMeal}')">❤️ </button>
`;

    recipeList.appendChild(card);
    
  });
}
// Fetch and show recipe details
async function getRecipeDetails(id) {
  recipeDetails.innerHTML = '<p>Loading recipe details...</p>';
  recipeModal.classList.remove('hidden');

  const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const recipe = data.meals[0];

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ing = recipe[`strIngredient${i}`];
      const measure = recipe[`strMeasure${i}`];
      if (ing && ing.trim()) {
        ingredients.push(`${measure} ${ing}`);
      }
    }

    recipeDetails.innerHTML = `
      <h2>${recipe.strMeal}</h2>
      <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
      <p><strong>Category:</strong> ${recipe.strCategory} | <strong>Area:</strong> ${recipe.strArea}</p>
      <h3>Ingredients:</h3>
      <ul>${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      <button id="addToShoppingListBtn">Add Ingredients to Shopping List</button>
      <h3>Instructions:</h3>
      <p>${recipe.strInstructions}</p>
      ${recipe.strYoutube ? `<a href="${recipe.strYoutube}" target="_blank">▶ Watch on YouTube</a>` : ''}
    `;

    // Now that the button exists, attach the event listener here:
    document.getElementById('addToShoppingListBtn').addEventListener('click', () => {
      addIngredientsToShoppingList(ingredients);
    });

  } catch (error) {
    recipeDetails.innerHTML = '<p>Failed to load recipe details.</p>';
    console.error(error);
  }
}
// Modal close
closeBtn.addEventListener('click', () => {
  recipeModal.classList.add('hidden');
});
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) {
    recipeModal.classList.add('hidden');
  }
});

// Search form handler
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const query = searchInput.value.trim();
  const cuisine = cuisineSelect.value;
  const diet = dietSelect.value;

  fetchFilteredRecipes({ search: query, cuisine, diet });
});

// Fetch multiple random recipes from TheMealDB
async function fetchRandomRecipes() {
  recipeList.innerHTML = '<p>Loading random recipes...</p>';

  try {
    const recipes = [];
    const requests = [];

    // Request 12 random recipes in parallel
    for (let i = 0; i < 12; i++) {
      requests.push(fetch('https://www.themealdb.com/api/json/v1/1/random.php'));
    }

    const responses = await Promise.all(requests);

    for (const res of responses) {
      const data = await res.json();
      if (data.meals && data.meals[0]) {
        recipes.push(data.meals[0]);
      }
    }

    if (recipes.length === 0) {
      recipeList.innerHTML = '<p>No random recipes found.</p>';
      return;
    }

    displayRecipes(recipes);

  } catch (error) {
    recipeList.innerHTML = '<p>Error loading random recipes.</p>';
    console.error(error);
  }
}

// Attach event listener for random button
randomBtn.addEventListener('click', fetchRandomRecipes);
async function fetchFilteredRecipes({ search = '', cuisine = '', diet = '' }) {
  recipeList.innerHTML = '<p>Loading...</p>';

  try {
    let meals = [];

    // If search is there, get full details from search
    if (search) {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(search)}`);
      const data = await res.json();
      meals = data.meals || [];
    } else {
      // No search, so get filtered lists separately

      let cuisineMeals = [];
      let dietMeals = [];

      if (cuisine) {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`);
        const data = await res.json();
        cuisineMeals = data.meals || [];
      }

      if (diet) {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(diet)}`);
        const data = await res.json();
        dietMeals = data.meals || [];
      }

      if (cuisine && diet) {
        // Find intersection by idMeal
        const dietIds = new Set(dietMeals.map(m => m.idMeal));
        meals = cuisineMeals.filter(m => dietIds.has(m.idMeal));
      } else if (cuisine) {
        meals = cuisineMeals;
      } else if (diet) {
        meals = dietMeals;
      } else {
        // No filters or search
        meals = [];
      }
    }

    if (meals.length === 0) {
      recipeList.innerHTML = '<p>No recipes found with these filters.</p>';
      return;
    }

    // If meals from search, meals are full objects; else filter.php returns brief info
    // If brief info, display brief; if full info, display full cards
    if (search || meals[0].strInstructions) {
      displayRecipes(meals);
    } else {
      displayRecipesBrief(meals);
    }
  } catch (error) {
    recipeList.innerHTML = '<p>Error fetching recipes.</p>';
    console.error(error);
  }
}
cuisineSelect.addEventListener('change', () => {
  const query = searchInput.value.trim();
  const cuisine = cuisineSelect.value;
  const diet = dietSelect.value;
  fetchFilteredRecipes({ search: query, cuisine, diet });
});

dietSelect.addEventListener('change', () => {
  const query = searchInput.value.trim();
  const cuisine = cuisineSelect.value;
  const diet = dietSelect.value;
  fetchFilteredRecipes({ search: query, cuisine, diet });
});
// Add this function to your app.js
function displayRecipesBrief(recipes) {
  recipeList.innerHTML = '';
  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.classList.add('recipe-card');
    card.innerHTML = `
  <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
  <h3>${recipe.strMeal}</h3>
  <button onclick="getRecipeDetails('${recipe.idMeal}')">View Details</button>
  <button onclick="addToFavorites('${recipe.idMeal}')">❤️ </button>
`;

    recipeList.appendChild(card);
    

  });
}
function sortRecipesAlphabetically(recipes, order = "asc") {
  return recipes.sort((a, b) => {
    const nameA = a.strMeal.toLowerCase();
    const nameB = b.strMeal.toLowerCase();
    return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });
}
document.getElementById('sortSelect').addEventListener('change', () => {
  const query = searchInput.value.trim();
  const cuisine = cuisineSelect.value;

  if (cuisine) {
    fetchRecipesByCuisine(cuisine);
  } else if (query) {
    fetchRecipes(query);
  } else {
    fetchRecipes("chicken");
  }
});

document.getElementById('viewFavoritesBtn').addEventListener('click', async () => {
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

  if (favorites.length === 0) {
    recipeList.innerHTML = '<p>No favorite recipes saved.</p>';
    return;
  }

  recipeList.innerHTML = '<p>Loading favorites...</p>';
  const recipes = [];

  for (const id of favorites) {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
    const data = await res.json();
    if (data.meals) {
      recipes.push(data.meals[0]);
    }
  }

  displayRecipes(recipes);
});
function addToFavorites(id) {
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  if (!favorites.includes(id)) {
    favorites.push(id);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert("Added to favorites!");
  } else {
    alert("Already in favorites!");
  }
}

function removeFromFavorites(id) {
  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  favorites = favorites.filter(favId => favId !== id);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  loadFavorites(); // Refresh the list
}

function loadFavorites() {
  const recipeList = document.getElementById('recipeList');
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  
  if (favorites.length === 0) {
    recipeList.innerHTML = '<p>No favorites added yet.</p>';
    return;
  }
  
  recipeList.innerHTML = '';
  
  favorites.forEach(id => {
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      .then(res => res.json())
      .then(data => {
        const recipe = data.meals[0];
        const card = document.createElement('div');
        card.classList.add('recipe-card');
        card.innerHTML = `
  <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
  <h3>${recipe.strMeal}</h3>
  <button onclick="getRecipeDetails('${recipe.idMeal}')">View Details</button>
  <button class="remove-fav-btn" data-id="${recipe.idMeal}">🗑 Remove</button>
`;

        recipeList.appendChild(card);
      })
      .catch(err => {
        console.error('Error loading favorite recipe:', err);
      });
  });
}

const viewFavoritesBtn = document.getElementById('viewFavoritesBtn');
viewFavoritesBtn.addEventListener('click', loadFavorites);


recipeList.addEventListener('click', (e) => {
  if (e.target.matches('.remove-fav-btn')) {
    const id = e.target.dataset.id;
    removeFromFavorites(id);
  }
});
window.removeFromFavorites = removeFromFavorites;
window.loadFavorites = loadFavorites;
function addIngredientsToShoppingList(ingredients) {
  let shoppingList = JSON.parse(localStorage.getItem('shoppingList')) || [];

  // Add new ingredients, avoid duplicates
  ingredients.forEach(ingredient => {
    if (!shoppingList.includes(ingredient)) {
      shoppingList.push(ingredient);
    }
  });

  localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  alert('Ingredients added to shopping list!');
}
const shoppingListContainer = document.getElementById('shoppingListContainer');
const viewShoppingListBtn = document.getElementById('viewShoppingListBtn');

viewShoppingListBtn.addEventListener('click', () => {
  loadShoppingList();
  shoppingListContainer.classList.toggle('hidden');
});
function loadShoppingList() {
  let shoppingList = JSON.parse(localStorage.getItem('shoppingList')) || [];

  if (shoppingList.length === 0) {
    shoppingListContainer.innerHTML = '<p>Your shopping list is empty.</p>';
    return;
  }

  shoppingListContainer.innerHTML = `
    <h3>Shopping List</h3>
    <ul>
      ${shoppingList.map((item, index) => `
        <li>
          ${item} 
          <button onclick="removeFromShoppingList(${index})">❌</button>
        </li>
      `).join('')}
    </ul>
    <button id="clearShoppingListBtn">Clear Shopping List</button>
  `;

  document.getElementById('clearShoppingListBtn').addEventListener('click', clearShoppingList);
}
function removeFromShoppingList(index) {
  let shoppingList = JSON.parse(localStorage.getItem('shoppingList')) || [];
  shoppingList.splice(index, 1);
  localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  loadShoppingList(); // Refresh the view
}
function clearShoppingList() {
  localStorage.removeItem('shoppingList');
  loadShoppingList();
}
const recipeForm = document.getElementById('recipeForm');
const sharedRecipes = document.getElementById('sharedRecipes');

recipeForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const name = document.getElementById('recipeName').value;
  const ingredients = document.getElementById('recipeIngredients').value;
  const instructions = document.getElementById('recipeInstructions').value;
  const image = document.getElementById('recipeImage').value || 'https://via.placeholder.com/600x200.png?text=Your+Recipe+Image';

  const recipeHTML = `
    <div class="recipe-card">
      <img src="${image}" alt="${name}">
      <h3>${name}</h3>
      <p><strong>Ingredients:</strong> ${ingredients}</p>
      <p><strong>Instructions:</strong> ${instructions}</p>
    </div>
  `;

  sharedRecipes.insertAdjacentHTML('beforeend', recipeHTML);
  recipeForm.reset();
  ['recipeIngredients', 'recipeInstructions'].forEach(id => localStorage.removeItem(id));
 // Clear form
});
// Auto-save & load form data

const fieldsToSave = ['recipeIngredients', 'recipeInstructions'];

// Load saved data on page load
window.addEventListener('DOMContentLoaded', () => {
  fieldsToSave.forEach(fieldId => {
    const savedValue = localStorage.getItem(fieldId);
    if (savedValue) {
      document.getElementById(fieldId).value = savedValue;
    }
  });
});

// Save data while typing
fieldsToSave.forEach(fieldId => {
  const field = document.getElementById(fieldId);
  field.addEventListener('input', () => {
    localStorage.setItem(fieldId, field.value);
  });
});

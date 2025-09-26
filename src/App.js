import { useEffect, useRef, useState } from "react";
import { Fraction } from "fraction.js";
import { TIMEOUT_SEC, RESULTS_PER_PAGE, API_URL, API_KEY } from "./config";
import { transformObject, wait } from "./helpers";
import { useLocalStorageState } from "./useLocalStorageState";

function App() {
  const [recipe, setRecipe] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [bookmarks, setBookmarks] = useLocalStorageState([], "bookmarks");

  function handleSelect(id) {
    setSelectedId(id);
  }

  function handleAddBookmark(recipe) {
    if (bookmarks.some((bookmark) => bookmark.id === recipe.id))
      setBookmarks(bookmarks.filter((bookmark) => bookmark.id !== recipe.id));
    else setBookmarks((bookmarks) => [...bookmarks, recipe]);
  }

  function handleOpen() {
    setIsOpen((isOpen) => !isOpen);
  }

  return (
    <>
      <Container>
        <Header
          setSearchQuery={setSearchQuery}
          bookmarks={bookmarks}
          selectedId={selectedId}
          onSelect={handleSelect}
          onOpen={handleOpen}
        />
        <SearchResults
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        <Recipe
          selectedId={selectedId}
          recipe={recipe}
          bookmarks={bookmarks}
          onAddBookmark={handleAddBookmark}
          setRecipe={setRecipe}
        />
      </Container>
      {isOpen && (
        <>
          <Modal
            recipe={recipe}
            setRecipe={setRecipe}
            onOpen={handleOpen}
            onAddBookmark={handleAddBookmark}
            onSelect={handleSelect}
          />
          <Overlay onOpen={handleOpen} />
        </>
      )}
    </>
  );
}

function Container({ children }) {
  return <div className="container">{children}</div>;
}

function Header({ onOpen, bookmarks, selectedId, setSearchQuery, onSelect }) {
  const [query, setQuery] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setSearchQuery(query);

    setQuery("");
  }

  return (
    <header className="header">
      <img src="img/logo.png" alt="Logo" className="header__logo" />
      <form className="search" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search__field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search over 1,000,000 recipes..."
        />
        <button className="btn search__btn">
          <svg className="search__icon">
            <use href="img/icons.svg#icon-search"></use>
          </svg>
          <span>Search</span>
        </button>
      </form>

      <nav className="nav">
        <ul className="nav__list">
          <li className="nav__item">
            <button className="nav__btn nav__btn--add-recipe" onClick={onOpen}>
              <svg className="nav__icon">
                <use href="img/icons.svg#icon-edit"></use>
              </svg>
              <span>Add recipe</span>
            </button>
          </li>
          <li className="nav__item">
            <button className="nav__btn nav__btn--bookmarks">
              <svg className="nav__icon">
                <use href="img/icons.svg#icon-bookmark"></use>
              </svg>
              <span>Bookmarks</span>
            </button>
            <Bookmarks
              bookmarks={bookmarks}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </li>
        </ul>
      </nav>
    </header>
  );
}

function Bookmarks({ bookmarks, selectedId, onSelect }) {
  return (
    <div className="bookmarks">
      {bookmarks.length > 0 ? (
        <ul className="bookmarks__list">
          {bookmarks.map((bookmark) => (
            <Item
              recipe={bookmark}
              selectedId={selectedId}
              onSelect={onSelect}
              key={bookmark.id}
            />
          ))}
        </ul>
      ) : (
        <Message msg="No bookmarks yet. Find a nice recipe and bookmark it :)" />
      )}
    </div>
  );
}

function SearchResults({ searchQuery, selectedId, setSearchQuery, onSelect }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);

  //? Derived state
  const start = (page - 1) * RESULTS_PER_PAGE;
  const end = page * RESULTS_PER_PAGE;
  const paginatedResults = results.slice(start, end);
  const numPages = Math.ceil(results.length / RESULTS_PER_PAGE);

  useEffect(
    function () {
      const controller = new AbortController();

      const fetchData = async function () {
        try {
          setIsLoading(true);
          setError("");
          setPage(1);

          const res = await Promise.race([
            fetch(`${API_URL}?search=${searchQuery}&key=${API_KEY}`, {
              signal: controller.signal,
            }),
            wait(TIMEOUT_SEC),
          ]);
          const data = await res.json();

          if (!res.ok)
            throw new Error("Something went wrong with fetching data");

          if (data.data.recipes.length === 0)
            throw new Error(
              "No recipes found for your search query. Try again :)"
            );

          const recipes = data.data.recipes.map((recipe) =>
            transformObject(recipe)
          );

          setResults(recipes);
          setIsLoading(false);
          setSearchQuery("");
        } catch (err) {
          if (err?.name !== "AbortError") {
            setSearchQuery("");
            setError(err?.message);
            setIsLoading(false);
          }
        }
      };

      if (!searchQuery) {
        return;
      }

      fetchData();

      //? cleanup function
      return () => controller.abort();
    },
    [searchQuery, setSearchQuery]
  );

  return (
    <div className="search-results">
      {isLoading && <Spinner />}
      {error && (
        <Message className="error" icon="icon-alert-triangle" msg={error} />
      )}
      {!error && !isLoading && results.length > 0 && (
        <>
          <ul className="results">
            {paginatedResults.map((recipe) => (
              <Item
                recipe={recipe}
                selectedId={selectedId}
                onSelect={onSelect}
                key={recipe.id}
              />
            ))}
          </ul>
          <Paginate page={page} numPages={numPages} setPage={setPage} />
        </>
      )}

      <p className="copyright">
        &copy; Copyright by{" "}
        <a className="twitter-link" target="_blank" href="#hero">
          Dushimimana Fabrice
        </a>{" "}
        {new Date().getFullYear()}. All rights reserved
      </p>
    </div>
  );
}

function Paginate({ page, numPages, setPage }) {
  return (
    <div className="pagination">
      {Array.from({ length: numPages }, (_, i) => (
        <button
          className={`pagination__btn${
            page === i + 1 ? " pagination__btn--active" : ""
          } `}
          key={i}
          onClick={() => setPage(i + 1)}
        >
          <span>{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

function Item({ selectedId, recipe, onSelect }) {
  const isTrue = selectedId === recipe.id;

  function handleClick(event) {
    event.preventDefault();
    onSelect(recipe.id);
  }

  return (
    <li className="preview" onClick={handleClick}>
      <a
        className={`preview__link${isTrue ? " preview__link--active" : ""}`}
        href="#fjf"
      >
        <figure className="preview__fig">
          <img src={recipe.imageUrl} alt={recipe.title} />
        </figure>
        <div className="preview__data">
          <h4 className="preview__title">{recipe.title}</h4>
          <p className="preview__publisher">{recipe.publisher}</p>
          {recipe.key && (
            <div className="preview__user-generated">
              <svg>
                <use href="img/icons.svg#icon-user"></use>
              </svg>
            </div>
          )}
        </div>
      </a>
    </li>
  );
}

function Recipe({ selectedId, recipe, bookmarks, onAddBookmark, setRecipe }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //? Derived state
  const isFilled = Object.entries(recipe).length > 0;
  const isBookmarked = bookmarks.some((bookmark) => bookmark.id === recipe.id);

  function handleClick() {
    onAddBookmark(recipe);
  }

  function handleUpdateServings(newServings) {
    const ingredients = recipe.ingredients.map((ing) => {
      const quantity = (ing.quantity * newServings) / recipe.servings;
      return { ...ing, quantity };
    });

    setRecipe((recipe) => ({ ...recipe, servings: newServings, ingredients }));
  }

  useEffect(
    function () {
      const fetchRecipeData = async function () {
        try {
          setIsLoading(true);
          setError("");

          const res = await Promise.race([
            fetch(`${API_URL}/${selectedId}?key=${API_KEY}`),
            wait(TIMEOUT_SEC),
          ]);
          const data = await res.json();
          const recipe = transformObject(data.data.recipe);

          setRecipe(recipe);
          setIsLoading(false);
        } catch (err) {
          setIsLoading(false);
          setError(err?.message);
        }
      };

      if (!selectedId) return;
      fetchRecipeData();
    },
    [selectedId, setRecipe, isFilled]
  );

  return (
    <div className="recipe">
      {isLoading && <Spinner />}
      {error && (
        <Message className="error" icon="icon-alert-triangle" msg={error} />
      )}
      {!error && !isLoading && !isFilled && <Message />}
      {!error && !isLoading && isFilled && (
        <>
          <figure className="recipe__fig">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="recipe__img"
            />
            <h1 className="recipe__title">
              <span>{recipe.title}</span>
            </h1>
          </figure>

          <div className="recipe__details">
            <div className="recipe__info">
              <svg className="recipe__info-icon">
                <use href="img/icons.svg#icon-clock"></use>
              </svg>
              <span className="recipe__info-data recipe__info-data--minutes">
                {recipe.cookingTime}
              </span>
              <span className="recipe__info-text">minutes</span>
            </div>
            <div className="recipe__info">
              <svg className="recipe__info-icon">
                <use href="img/icons.svg#icon-users"></use>
              </svg>
              <span className="recipe__info-data recipe__info-data--people">
                {recipe.servings}
              </span>
              <span className="recipe__info-text">servings</span>

              <div className="recipe__info-buttons">
                <button
                  className="btn--tiny btn--increase-servings"
                  onClick={() => {
                    if (recipe.servings > 1)
                      handleUpdateServings(recipe.servings - 1);
                  }}
                >
                  <svg>
                    <use href="img/icons.svg#icon-minus-circle"></use>
                  </svg>
                </button>
                <button
                  className="btn--tiny btn--increase-servings"
                  onClick={() => {
                    if (recipe.servings)
                      handleUpdateServings(recipe.servings + 1);
                  }}
                >
                  <svg>
                    <use href="img/icons.svg#icon-plus-circle"></use>
                  </svg>
                </button>
              </div>
            </div>

            <div className="recipe__user-generated">
              {recipe.key ? (
                <svg>
                  <use href="img/icons.svg#icon-user"></use>
                </svg>
              ) : (
                ""
              )}
            </div>
            <button className="btn--round" onClick={handleClick}>
              <svg className="">
                <use
                  href={`img/icons.svg#icon-bookmark${
                    isBookmarked ? "-fill" : ""
                  }`}
                ></use>
              </svg>
            </button>
          </div>

          <div className="recipe__ingredients">
            <h2 className="heading--2">Recipe ingredients</h2>
            <ul className="recipe__ingredient-list">
              {recipe.ingredients.map((ing, idx) => (
                <RecipeIngredient ing={ing} key={idx} />
              ))}
            </ul>
          </div>

          <div className="recipe__directions">
            <h2 className="heading--2">How to cook it</h2>
            <p className="recipe__directions-text">
              This recipe was carefully designed and tested by{" "}
              <span className="recipe__publisher">{recipe.publisher}</span>.
              Please check out directions at their website.
            </p>
            <a
              className="btn--small recipe__btn"
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>Directions</span>
              <svg className="search__icon">
                <use href="img/icons.svg#icon-arrow-right"></use>
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function RecipeIngredient({ ing }) {
  const quantity = new Fraction(Number(ing.quantity)).simplify().toFraction();

  return (
    <li className="recipe__ingredient">
      <svg className="recipe__icon">
        <use href="img/icons.svg#icon-check"></use>
      </svg>
      <div className="recipe__quantity">{quantity === "0" ? "" : quantity}</div>
      <div className="recipe__description">
        <span className="recipe__unit">{ing.unit} </span>
        {ing.description}
      </div>
    </li>
  );
}

function Modal({ onSelect, recipe, setRecipe, onOpen, onAddBookmark }) {
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const formEl = useRef(null);

  //? Derived state
  const isFilled = Object.entries(recipe).length > 0;

  async function handleSubmit(event) {
    try {
      event.preventDefault();
      setIsLoading(true);
      setError("");

      const formData = new FormData(formEl.current);
      const formObj = Object.fromEntries(formData);

      const ingredients = Object.entries(formObj)
        .filter(([key]) => key.startsWith("ingredient"))
        .reduce((acc, [_, value]) => {
          const values = value.split(",");
          if (values.length < 3) return acc;

          const [quantity, unit, description] = values;

          const obj = { quantity: Number(quantity), unit, description };

          acc.push(obj);
          return acc;
        }, []);

      const recipeData = {
        cooking_time: +formObj.cookingTime,
        servings: +formObj.servings,
        title: formObj.title,
        source_url: formObj.sourceUrl,
        publisher: formObj.publisher,
        image_url: formObj.image,
        ingredients,
      };

      const res = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const recipe = transformObject(data.data.recipe);

      setRecipe(recipe);
      onAddBookmark(recipe);
      setSuccess("Recipe uploaded successfully");
      setIsLoading(false);
      onSelect(recipe.id);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  useEffect(
    function () {
      setTimeout(() => {
        if (isFilled) {
          setSuccess("");
          onOpen();
        }
      }, 3000);
    },
    [recipe, onOpen, isFilled]
  );

  return (
    <div className="add-recipe-window">
      <button className="btn--close-modal" onClick={onOpen}>
        &times;
      </button>
      {isLoading && <Spinner />}

      {error && (
        <Message msg={error} icon="icon-alert-triangle" className="error" />
      )}

      {!isLoading && !error && success && (
        <Message msg="Recipe Uploaded successfully" />
      )}

      {!isLoading && !error && !success && (
        <form className="upload" ref={formEl} onSubmit={handleSubmit}>
          <div className="upload__column">
            <h3 className="upload__heading">Recipe data</h3>
            <label>Title</label>
            <input defaultValue="TEST" required name="title" type="text" />
            <label>URL</label>
            <input defaultValue="TEST" required name="sourceUrl" type="text" />
            <label>Image URL</label>
            <input defaultValue="TEST" required name="image" type="text" />
            <label>Publisher</label>
            <input defaultValue="TEST" required name="publisher" type="text" />
            <label>Prep time</label>
            <input
              defaultValue="23"
              required
              name="cookingTime"
              type="number"
            />
            <label>Servings</label>
            <input defaultValue="23" required name="servings" type="number" />
          </div>

          <div className="upload__column">
            <h3 className="upload__heading">Ingredients</h3>
            <label>Ingredient 1</label>
            <input
              defaultValue="0.5,kg,Rice"
              type="text"
              required
              name="ingredient-1"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
            <label>Ingredient 2</label>
            <input
              defaultValue="1,,Avocado"
              type="text"
              name="ingredient-2"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
            <label>Ingredient 3</label>
            <input
              defaultValue=",,salt"
              type="text"
              name="ingredient-3"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
            <label>Ingredient 4</label>
            <input
              type="text"
              name="ingredient-4"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
            <label>Ingredient 5</label>
            <input
              type="text"
              name="ingredient-5"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
            <label>Ingredient 6</label>
            <input
              type="text"
              name="ingredient-6"
              placeholder="Format: 'Quantity,Unit,Description'"
            />
          </div>

          <button className="btn upload__btn">
            <svg>
              <use href="src/img/icons.svg#icon-upload-cloud"></use>
            </svg>
            <span>Upload</span>
          </button>
        </form>
      )}
    </div>
  );
}

function Overlay({ onOpen }) {
  return <div className="overlay" onClick={onOpen}></div>;
}

function Spinner() {
  return (
    <div className="spinner">
      <svg>
        <use href="img/icons.svg#icon-loader"></use>
      </svg>
    </div>
  );
}

function Message({
  msg = "Start by searching for a recipe or an ingredient. Have fun!",
  className = "message",
  icon = "icon-smile",
}) {
  return (
    <div className={className}>
      <div>
        <svg>
          <use href={`img/icons.svg#${icon}`}></use>
        </svg>
      </div>
      <p>{msg}</p>
    </div>
  );
}

export default App;

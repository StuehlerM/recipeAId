Feature: Ingredient-based recipe search
  As a user
  I want to search for recipes by ingredients I have available
  So that I can use what is in my fridge

  Background:
    Given a recipe exists with title "Garlic Pasta" and ingredients:
      | name   | quantity |
      | garlic | 3 cloves |
      | pasta  | 400g     |
    And a recipe exists with title "Garlic Bread" and ingredients:
      | name   | quantity |
      | garlic | 2 cloves |
      | bread  | 1 loaf   |

  Scenario: Finding recipes by one ingredient
    When I navigate to the ingredient search page
    And I add ingredient chip "garlic"
    And I click "Find Recipes"
    Then I should see "Garlic Pasta" in the search results
    And I should see "Garlic Bread" in the search results

  Scenario: Two-ingredient search ranks the better match higher
    When I navigate to the ingredient search page
    And I add ingredient chip "garlic"
    And I add ingredient chip "pasta"
    And I click "Find Recipes"
    Then I should see "Garlic Pasta" in the search results
    And "Garlic Pasta" should appear before "Garlic Bread" in the results

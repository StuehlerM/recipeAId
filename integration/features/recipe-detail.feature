Feature: Recipe detail view
  As a user
  I want to view a recipe's full details
  So that I can follow the recipe when cooking

  Background:
    Given a recipe exists with title "Lemon Garlic Chicken" and ingredients:
      | name          | amount | unit   |
      | whole chicken | 1.5    | kg     |
      | lemon         | 2      |        |
      | garlic        | 6      | cloves |

  Scenario: Viewing recipe ingredients
    When I navigate to the detail page for "Lemon Garlic Chicken"
    Then I should see the ingredient "lemon"
    And I should see the quantity "2"

  Scenario: Deleting a recipe returns to the list
    When I navigate to the detail page for "Lemon Garlic Chicken"
    And I click "Delete recipe" and confirm
    Then I should be on the recipe list page
    And I should not see "Lemon Garlic Chicken" in the recipe list

  Scenario: Nutrition section is shown on recipe detail page
    When I navigate to the detail page for "Lemon Garlic Chicken"
    Then I should see the nutrition section heading "Nutrition"
    And I should see the macro label "Protein"
    And I should see the macro label "Carbs"
    And I should see the macro label "Fat"
    And I should see the macro label "Fiber"

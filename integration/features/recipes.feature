Feature: Recipe list and title search
  As a user
  I want to browse my recipe collection and search by title
  So that I can quickly find a recipe

  Background:
    Given a recipe exists with title "Banana Pancakes"
    And a recipe exists with title "Spaghetti Bolognese"

  Scenario: Viewing all recipes
    When I navigate to the recipe list page
    Then I should see "Banana Pancakes" in the recipe list
    And I should see "Spaghetti Bolognese" in the recipe list

  Scenario: Searching by title finds matching recipes
    When I navigate to the recipe list page
    And I search for "Banana"
    Then I should see "Banana Pancakes" in the recipe list
    And I should not see "Spaghetti Bolognese" in the recipe list

  Scenario: Clicking a recipe navigates to its detail page
    When I navigate to the recipe list page
    And I click on "Banana Pancakes"
    Then I should be on the recipe detail page
    And I should see the heading "Banana Pancakes"

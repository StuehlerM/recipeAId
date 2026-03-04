Feature: Weekly meal planner
  As a user
  I want to plan meals for the week
  So that I can organize my meals and generate shopping lists

  Background:
    Given a recipe exists with title "Spaghetti Bolognese"
    And a recipe exists with title "Caesar Salad" and ingredients:
      | name     | amount | unit |
      | lettuce  | 1      | head |
      | croutons | 50     | g    |
    And a recipe exists with title "Grilled Chicken" and ingredients:
      | name   | amount | unit |
      | chicken| 4      | breast|

  Scenario: Adding a recipe to the plan
    When I navigate to the planner page
    And I add "Spaghetti Bolognese" to the plan
    Then I should see "Spaghetti Bolognese" in the weekly plan

  Scenario: Multiple recipes can be added to the plan
    When I navigate to the planner page
    And I add "Spaghetti Bolognese" to the plan
    And I add "Caesar Salad" to the plan
    Then I should see "Spaghetti Bolognese" in the weekly plan
    And I should see "Caesar Salad" in the weekly plan

  Scenario: Removing a recipe from the plan
    When I navigate to the planner page
    And I add "Spaghetti Bolognese" to the plan
    And I remove "Spaghetti Bolognese" from the plan
    Then I should not see "Spaghetti Bolognese" in the weekly plan

  Scenario: Shopping list shows ingredients of planned recipes
    When I navigate to the planner page
    And I add "Caesar Salad" to the plan
    Then the shopping list should contain "lettuce"
    And the shopping list should contain "croutons"

  Scenario: Shopping list updates when recipe is removed
    When I navigate to the planner page
    And I add "Caesar Salad" to the plan
    And I remove "Caesar Salad" from the plan
    Then the shopping list section should not be visible

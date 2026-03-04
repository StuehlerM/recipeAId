Feature: Manual recipe creation via wizard
  As a user
  I want to create a recipe through a guided step-by-step wizard
  So that I can save a new recipe to my collection with all details

  Scenario: Creating a new recipe through the wizard
    When I navigate to the add recipe page
    And I fill in the title "Test Chocolate Cake"
    And I click "Next →"
    And I add an ingredient with name "flour" and amount "2" and unit "cups"
    And I add an ingredient with name "cocoa" and amount "50" and unit "g"
    And I click "Next →"
    And I click "Next →"
    And I click "Save Recipe"
    Then I should be on the recipe detail page
    And I should see the heading "Test Chocolate Cake"
    And I should see the ingredient "flour"

  Scenario: Validation error appears when title is empty
    When I navigate to the add recipe page
    And I click "Next →"
    Then I should see a title validation error

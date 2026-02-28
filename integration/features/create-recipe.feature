Feature: Manual recipe creation
  As a user
  I want to create a recipe by filling in a form
  So that I can save a new recipe to my collection

  Scenario: Creating a new recipe manually
    When I navigate to the upload page
    And I click "Enter recipe manually instead"
    And I fill in the title "Test Chocolate Cake"
    And I add an ingredient with name "flour" and quantity "2 cups"
    And I add an ingredient with name "cocoa" and quantity "50g"
    And I click "Save Recipe"
    Then I should be on the recipe detail page
    And I should see the heading "Test Chocolate Cake"
    And I should see the ingredient "flour"

  Scenario: Save button is disabled when title is empty
    When I navigate to the upload page
    And I click "Enter recipe manually instead"
    Then the "Save Recipe" button should be disabled

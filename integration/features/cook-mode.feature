Feature: Cook mode
  As a home cook
  I want a focused cook mode with step-by-step navigation
  So that I can follow instructions without distraction

  Scenario: Opening cook mode from recipe detail and moving through steps
    Given a recipe exists with title "Quick Omelette", instructions "1. Crack eggs into a bowl.\\n2. Whisk with salt.\\n3. Cook in a pan until set.", and ingredients:
      | name | amount | unit |
      | egg  | 2      |      |
      | salt | 1      | pinch |
    When I navigate to the detail page for "Quick Omelette"
    And I click on "Start cooking"
    Then I should be on the cook mode page
    And I should see cook mode step 1 of 3
    And I should see the current cook step "Crack eggs into a bowl."
    When I click "Next step"
    Then I should see cook mode step 2 of 3
    And I should see the current cook step "Whisk with salt."

  Scenario: Cook mode shows fallback step when instructions are blank
    Given a recipe exists with title "No Instructions Yet", instructions "   ", and ingredients:
      | name  | amount | unit |
      | flour | 100    | g    |
    When I navigate to the detail page for "No Instructions Yet"
    And I click on "Start cooking"
    Then I should be on the cook mode page
    And I should see cook mode step 1 of 1

Feature: Ingredient parsing via public LLM API
  As a user
  I want my uploaded recipe photo to produce a structured ingredient list
  So that I can save a recipe without manually typing each ingredient

  Scenario: Uploading a recipe image produces an immediate OCR draft
    Given the ingredient parser API key is configured
    When I upload an image with visible ingredients
    And I wait for the ingredient parsing to complete
    Then the recipe draft should contain at least one structured ingredient with a name

  Scenario: Parsing an ingredient string returns a structured list
    Given the ingredient parser API key is configured
    When I parse the text "2 cups flour, 100g sugar"
    Then the response should contain at least one ingredient with a name


Feature: Ingredient parsing via public LLM API
  As a user
  I want my uploaded recipe photo to produce a structured ingredient list
  So that I can save a recipe without manually typing each ingredient

  Scenario: Uploading a recipe image results in a structured ingredient list
    Given the ingredient parser API key is configured
    When I upload an image with visible ingredients
    And I wait for the ingredient parsing to complete
    Then the recipe draft should contain at least one structured ingredient with a name

  Scenario: Ingredient parser returns 502 when API key is missing
    Given the ingredient parser API key is not configured
    When I call the ingredient parse endpoint with text "2 cups flour"
    Then the response status should be 502
    And the response body should contain a ProblemDetails error

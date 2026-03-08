Feature: Recipe image storage
  As a user
  I want my uploaded recipe photos to be stored with the recipe
  So that I can see the original image when viewing the recipe

  Scenario: Image slot returns 404 when no image is stored
    Given a recipe exists with title "No Image Recipe"
    When I request the image for slot "title" via the API
    Then the API response status is 404

  Scenario: Invalid slot name returns 400
    Given a recipe exists with title "Test Recipe"
    When I request the image for slot "invalid" via the API
    Then the API response status is 400

  Scenario: Stored image is served from the detail page
    Given a recipe exists with title "Photo Recipe"
    And I store a test image for slot "title" of that recipe
    When I navigate to the recipe detail page
    Then an image is visible on the page

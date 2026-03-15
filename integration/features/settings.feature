Feature: Settings — dark theme toggle
  As a user
  I want to switch between light and dark themes in Settings
  So that I can use the app comfortably in low-light environments

  Scenario: Toggling dark theme changes the page appearance immediately
    Given I navigate to the settings page
    When I toggle the dark theme switch
    Then the page should have the dark theme applied
    And the dark class should be present on the html element

  Scenario: Dark theme preference is restored after page reload
    Given I navigate to the settings page
    And I toggle the dark theme switch
    When I reload the page
    Then the dark theme switch should still be enabled
    And the dark class should be present on the html element

  Scenario: Toggling dark theme off restores the light theme
    Given I navigate to the settings page
    And I toggle the dark theme switch
    When I toggle the dark theme switch again
    Then the page should have the light theme applied
    And the dark class should not be present on the html element

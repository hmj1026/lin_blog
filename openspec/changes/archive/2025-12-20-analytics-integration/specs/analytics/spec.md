## ADDED Requirements

### Requirement: Support Google Analytics 4
The system MUST include Google Analytics 4 script when a Measurement ID is provided via environment variables.

#### Scenario: GA ID provided
- **GIVEN** `NEXT_PUBLIC_GA_ID` is set to "G-12345"
- **WHEN** the application loads
- **THEN** the GA4 script with ID "G-12345" should be initialized

#### Scenario: GA ID missing
- **GIVEN** `NEXT_PUBLIC_GA_ID` is not set
- **WHEN** the application loads
- **THEN** the GA4 script should NOT be present

### Requirement: Support Google Tag Manager
The system MUST include Google Tag Manager script when a Container ID is provided via environment variables.

#### Scenario: GTM ID provided
- **GIVEN** `NEXT_PUBLIC_GTM_ID` is set to "GTM-ABCDE"
- **WHEN** the application loads
- **THEN** the GTM script with ID "GTM-ABCDE" should be initialized

### Requirement: Support Facebook Pixel
The system MUST include Facebook Pixel script when a Pixel ID is provided via environment variables.

#### Scenario: FB Pixel ID provided
- **GIVEN** `NEXT_PUBLIC_FB_PIXEL_ID` is set to "123456789"
- **WHEN** the application loads
- **THEN** the Facebook Pixel script with ID "123456789" should be initialized

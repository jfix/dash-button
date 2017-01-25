About this
----------

I'd like to let my wife know when I have safely arrived at work, or when I'm about to leave the office.  This usually involves sending an SMS. Which usually is difficult because there is no network in the underground parking garage, nor in the lift, and once arrived on my floor, distractions are manifold.  Pushing a simple button to send a message would be the solution.

Obviously, why not handle another button that will count the cups of coffee consumed every day, by adding a line to a Google Spreadsheet, for example?

Requirements:

* pushing the button in the morning should send a different message from pushing that same button in the evening. This excludes, unfortunately, IFTTT because the message cannot be specified by a web service payload, but needs to be entered in the IFTTT backend, with only few "Ingredients" available.
* use the cheap Amazon Dash button for 5 EUR/USD not the expensive one specifically built for use with AWS infrastructure (and which has more actions, like long push or double push). Just to make things more interesting (and also I can buy four buttons and do more stuff with it).
* send an SMS (not a mobile notification)
* needs to work well with the work IT environment
* use Node

"Tests are a luxury I can't afford!" -- Pope Francis 


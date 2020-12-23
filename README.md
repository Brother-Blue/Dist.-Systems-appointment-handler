## AppointmentHandler high-level description

The AppointmentHandler is responsible for all communication with the systems database, it also fetches the dentist registry file and updates the database according to the information from this file. After this it publishes the data (that is displayed on the bookingGUI) to the broker.
It also acts as a filter for the requests since all bookingrequests sent through the broker are handled in the AppointmentHandler, it ensures that there are no unintentional duplicate appointments, and that the appointments are stored in the database correctly and publishes a response to the broker.
Once a appointment has been added to the database, the AppointmentHandler publishes a confirmation, a log message and the filtered data to the broker.

### Communication

All communication between the AppointmentHandler and the rest of the system is done via a broker (excluding the database which is utilising a client/server style), using the MQTT-protocol applying a Publish/Subscribe architectural style.

### Error-handling

The circuit breaker is specifically significant in the system, because the Appointment Handler contains all data needed for the rest of the components to function. Because of this, a circuit breaker will help reduce recurring failures as well as system failure due to malicious attacks or overload.


### How to run 

1. Navigate to the server folder in the repository
1. Open the folder in a terminal
1. Run "npm install"
1. Run "npm run dev"
1. The AppointmentHandler should now be running
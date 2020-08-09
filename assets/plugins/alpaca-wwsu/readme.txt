This is a custom built Alpaca.

To avoid problems using Alpaca in classes, Alpaca's click callbacks do not modify "this" but instead pass what would have been "this" as the first parameter in the callback... the event is the second parameter.
# BroilerSync

ESP32 climate monitoring and automated ventilation for a two-compartment broiler house, with a web dashboard, alerts and data export.

## Parts of the system
- `firmware/`: ESP32 sketch. Reads 2 DHT22s and 2 anemometers, runs the fan and lamp, shows status on a 1602 I2C LCD, logs to microSD and syncs to Supabase.
- `firmware/prototype/`: single-file version for the Wokwi simulator.
- `web/`: Next.js website (coming in M3).
- `supabase/`: database migrations (coming in M3).

## Docs
- [Requirements](REQUIREMENTS.md)
- [Implementation plan](IMPLEMENTATION.md)
- [Rules for contributors](AGENTS.md)
- [CI/CD](docs/CI_CD.md)
- [Design](docs/DESIGN.md)
- Diagrams: `docs/images/`; parts list: `docs/item_lists.pdf`

## Build the firmware
See `firmware/README.md` for libraries, pins and the `arduino-cli` compile command.

# Geschlossener Google-Play-Test – technische Freigabe (14 Tage)

Status: **Vorbereitung; nicht deployed, noch keine sicheren Testzugänge aktiv.** Die öffentliche GitHub-Pages-Hauptseite bleibt unverändert.

## Verbindliche Anforderungen
- Nur von der Herausgeberin ausgewählte Tester; individuelle, nicht übertragbare Identität (Firebase Auth mit verifiziertem E-Mail-Konto, keine anonyme Authentifizierung als Testnachweis).
- Einladung ist **kein Premium-Token**. Ein Google-Play-Testlink allein darf niemals Premium freischalten.
- Freigabe der 220 Karten (beide Decks) für genau 14 Tage pro Tester, mit serverseitigem `expiresAt` und `revokedAt`. Keine automatische Verlängerung und keine Abbuchung.
- Entitlement bei App-Start und während der Nutzung serverseitig prüfen; nach Ablauf Premium wieder sperren.
- Separate Berechtigungsart `closed_test` vs. `paid_subscription`. Verkaufsversion darf Testberechtigungen nicht akzeptieren.
- Alle Premium-Fragen dürfen nicht als Klartext in öffentlich ausgelieferten JavaScript-Bundles liegen; stattdessen Premium-Inhalte erst nach erfolgreicher serverseitiger Berechtigungsprüfung ausgeben.
- Spielräume dürfen Premium-Fragen nicht über unberechtigte Partner, geteilte URLs oder Firestore-Dokumente offenlegen.

## Backend-Vorschlag (noch umzusetzen)
1. Firebase Authentication: E-Mail-Link-Anmeldung oder Google Sign-In; für Test-Einladungen verifizierte E-Mail mit Auth UID verknüpfen.
2. Geschützte Collection `testerEntitlements/{uid}`: `kind:'closed_test'`, `startsAt`, `expiresAt`, `revokedAt`, `enabled`, `email`. **Nur Admin SDK/Cloud Functions** dürfen schreiben; Clients dürfen nur eigene Metadaten lesen.
3. Admin-Funktion zum einmaligen Einladen/Freischalten; 14 Tage werden mit Serverzeit gesetzt. Nur Projektadministrator darf sie auslösen.
4. Callable Function `getAuthorizedCards` prüft Auth UID, `enabled`, `expiresAt > serverNow`, `revokedAt == null` und liefert autorisierte Kartentexte. Firestore Rules allein schützen keine in JS gebündelten Kartentexte.
5. App-Client: Premium nur bei positivem Serverergebnis; bei Offline/Fehler/Ablauf fail-closed. Keine `HEART_CLOSED_TEST_BUILD`-Umgebungsvariable als Freischaltung.
6. Separate Production-Entitlement-Prüfung mit Google Play Billing und serverseitiger Kaufverifikation.
7. Tests: fremde UID, weitergeleiteter Link, kopierte APK, Ablauf nach 14 Tagen, Widerruf, Offline, Raumbeitritt und Premium-Textleckage.

## Google Play
- App-Bundle (.aab) signieren und in Closed Testing hochladen.
- Tester per E-Mail-Liste/Google Group in Play Console einladen; **Play-Zulassung und Firebase-Premium-Freigabe sind zwei verschiedene Prüfungen**.
- Für neue private Entwicklerkonten kann Google mindestens 12 Tester über 14 aufeinanderfolgende Tage verlangen. Die Freigabe zur Produktion wird anschließend beantragt.
- Datenschutz, Store-Eintrag, Data Safety, App-Zugriff, Inhaltsbewertung und aktuelle Target-SDK-Vorgaben prüfen.

## Stand heute
- Vorhanden: beide Kartendecks, Paarmodus, Firebase-Räume, Android-Debug-APK.
- Offen: Auth-Login für Tester, Backend-Entitlements, servergeschützte Kartentexte, AAB-Signierung, Play-Console-Upload und Tester-Zuweisung.
- Der frühere lokale Premium-Testschalter wurde bewusst deaktiviert, da er keinen sicheren Zugangsschutz bietet.

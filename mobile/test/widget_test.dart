import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('ScanSafe app loads smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ScanSafeApp());
    expect(find.text('SCANSAFE'), findsOneWidget);
  });
}

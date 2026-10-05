// Các bước kiểm tra giao diện Hợp đồng, chạy trong dev/kiem-trinh-duyet.js (xem file đó để biết cách chạy).
// Đặt SHOT_DIR=<thư mục> để lưu ảnh chụp màn hình các bước chính.
const assert = require('assert'), path = require('path');
const so = t => String(t).replace(/\D/g, ''); // "24.860.000 ₫" -> "24860000"

module.exports = BUOC => {
  const shot = async (page, ten) => { if (process.env.SHOT_DIR) await page.screenshot({ path: path.join(process.env.SHOT_DIR, ten + '.png'), fullPage: true }); };
  const dialogs = [];
  const nut = (page, ten) => page.locator('#topActions .btn', { hasText: ten }).first();

  BUOC.push(['Hợp đồng: menu, danh sách trống', async page => {
    page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
    await page.click('#nav a[data-go="hopdong"]');
    await page.waitForSelector('text=Không có dữ liệu phù hợp');
    assert.match(await page.locator('#title').textContent(), /Hợp đồng/);
    await shot(page, 'hd-1-danh-sach-trong');
  }]);

  BUOC.push(['Hợp đồng: lập mới, chọn khách, chọn hàng, tính tiền và bằng chữ', async page => {
    await nut(page, 'Lập hợp đồng').click();
    await page.waitForSelector('input[data-h="TenDN"]');
    assert.strictEqual(await page.locator('select[data-h="LoaiHD"] option').count() >= 5, true, 'Phải có đủ loại hợp đồng mặc định');
    // Chọn khách có sẵn: bên A tự điền
    await page.fill('input[data-h="TenDN"]', 'minh');
    await page.locator('#picker [data-i]').first().click();
    assert.strictEqual(await page.inputValue('input[data-h="DiaChi"]'), 'Quận 3, TP.HCM');
    await page.fill('input[data-h="NguoiDaiDien"]', 'Nguyễn Văn Minh');
    await page.fill('input[data-h="ChucVu"]', 'Giám đốc');
    // Chọn hàng: đơn giá lấy từ bảng giá (không có giá sỉ nên lấy giá lẻ)
    await page.locator('tr[data-i="0"] [data-f="TenHang"]').evaluate(e => e.scrollIntoView({ block: 'center' })); // cuộn ô vào giữa màn hình rồi mới gõ: cuộn trang làm ẩn danh sách gợi ý
    await page.waitForTimeout(150);
    await page.fill('tr[data-i="0"] [data-f="TenHang"]', 'iphone 15');
    await page.locator('#picker [data-i]').first().click();
    assert.strictEqual(so(await page.inputValue('tr[data-i="0"] [data-f="DonGia"]')), '11300000');
    await page.fill('tr[data-i="0"] [data-f="SoLuong"]', '2');
    assert.strictEqual(so(await page.locator('[data-t="tong"]').textContent()), '22600000');
    assert.strictEqual(await page.inputValue('[data-t="chu"]'), 'Hai mươi hai triệu sáu trăm nghìn đồng chẵn.');
    await page.fill('input[data-h="VAT"]', '10');
    assert.strictEqual(so(await page.locator('[data-t="tong"]').textContent()), '24860000');
    assert.strictEqual(await page.inputValue('[data-t="chu"]'), 'Hai mươi tư triệu tám trăm sáu mươi nghìn đồng chẵn.');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 2, 'Luôn còn một dòng trống ở cuối để nhập tiếp');
    await page.fill('input[data-h="NgayHieuLuc"]', '2026-01-01');
    await page.fill('input[data-h="NgayHetHan"]', '2027-01-01');
    await shot(page, 'hd-2-form-day-du');
  }]);

  BUOC.push(['Hợp đồng: lưu, bổ sung thông tin vào khách, mở lại', async page => {
    dialogs.length = 0;
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => /Hợp đồng \d{3}-\d{4}\/HD/.test(document.querySelector('#title').textContent), null, { timeout: 8000 });
    assert.ok(dialogs.some(m => /Lưu thêm thông tin .* vào khách hàng/.test(m)), 'Phải hỏi bổ sung thông tin vào khách: ' + dialogs.join('|'));
    assert.deepStrictEqual(await page.evaluate(() => [S.khach.find(k => k.MaKH === 'KH00001').NguoiDaiDien, S.khach.find(k => k.MaKH === 'KH00001').ChucVu]), ['Nguyễn Văn Minh', 'Giám đốc']);
    await page.click('#nav a[data-go="hopdong"]');
    await page.waitForSelector('tbody tr[data-i]');
    const dong = await page.locator('tbody tr[data-i]').first().textContent();
    assert.ok(/Anh Minh/.test(dong) && /24\.860\.000/.test(dong) && /Soạn thảo/.test(dong), dong);
    await page.locator('tbody tr[data-i]').first().click();
    await page.waitForSelector('tr[data-i="0"] [data-f="TenHang"]');
    assert.match(await page.inputValue('tr[data-i="0"] [data-f="TenHang"]'), /iPhone 15/);
    assert.strictEqual(so(await page.locator('[data-t="tong"]').textContent()), '24860000');
    assert.strictEqual(await page.inputValue('input[data-h="NguoiDaiDien"]'), 'Nguyễn Văn Minh');
    // lập hợp đồng khác cho khách này: người đại diện đã được điền từ danh sách khách
    await page.click('#nav a[data-go="hopdong"]');
    await nut(page, 'Lập hợp đồng').click();
    await page.fill('input[data-h="TenDN"]', 'minh');
    await page.locator('#picker [data-i]').first().click();
    assert.strictEqual(await page.inputValue('input[data-h="ChucVu"]'), 'Giám đốc');
    assert.ok((await page.locator('select[data-h="SoDH"] option').count()) >= 1);
  }]);

  BUOC.push(['Hợp đồng: bỏ thay đổi chưa lưu thì được hỏi', async page => {
    dialogs.length = 0;
    await page.click('#nav a[data-go="home"]'); // form mới đã chọn khách nhưng chưa lưu
    assert.ok(dialogs.some(m => /chưa lưu/.test(m)), 'Phải hỏi trước khi bỏ: ' + dialogs.join('|'));
  }]);

  BUOC.push(['Hợp đồng: trạng thái sắp hết hạn / đã hết hạn và bộ lọc', async page => {
    await page.evaluate(async () => {
      const ngay = n => iso(new Date(Date.now() + n * 864e5));
      const mau = { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Công ty Hạn', TrangThai: 'Đang hiệu lực', VAT: 0, lines: [] };
      await api('luuHopDong', Object.assign({}, mau, { NgayHieuLuc: ngay(-100), NgayHetHan: ngay(10) }));
      await api('luuHopDong', Object.assign({}, mau, { TenDN: 'Công ty Quá Hạn', NgayHieuLuc: ngay(-200), NgayHetHan: ngay(-1) }));
      await api('luuHopDong', Object.assign({}, mau, { TenDN: 'Công ty Còn Dài', NgayHieuLuc: ngay(-1), NgayHetHan: ngay(300) }));
      await loadAll(); go('hopdong');
    });
    await page.waitForSelector('text=Sắp hết hạn · còn 10 ngày');
    assert.ok(await page.locator('text=Đã hết hạn').count() >= 1);
    await page.selectOption('select[data-f="tt"]', 'sap');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 1);
    assert.match(await page.locator('tbody tr[data-i]').first().textContent(), /Công ty Hạn/);
    await page.selectOption('select[data-f="tt"]', 'het');
    assert.match(await page.locator('tbody tr[data-i]').first().textContent(), /Quá Hạn/);
    await page.selectOption('select[data-f="tt"]', '');
    await shot(page, 'hd-3-danh-sach');
  }]);

  BUOC.push(['Hợp đồng: menu Sắp hết hạn có số đếm, màn hình riêng và thẻ trên Tổng quan', async page => {
    await page.evaluate(() => go('home'));
    await shot(page, 'hd-10-tong-quan');
    assert.strictEqual((await page.locator('#nav a[data-go="hdhan"] .cnt').textContent()).trim(), '2'); // 1 sắp hết hạn + 1 đã hết hạn
    const kpi = await page.locator('.kpi[data-go="hdhan"]').textContent();
    assert.ok(/Hợp đồng sắp hết hạn/.test(kpi) && /1 hợp đồng đã hết hạn/.test(kpi), kpi);
    const chuY = await page.locator('.card:has-text("Hợp đồng cần chú ý") tr').allTextContents();
    assert.strictEqual(chuY.length, 2);
    assert.ok(/Quá 1 ngày/.test(chuY[0]) && /Còn 10 ngày/.test(chuY[1]), 'Quá hạn xếp trước: ' + chuY.join('|'));
    await page.locator('.card:has-text("Hợp đồng cần chú ý") tr').first().click(); // mở thẳng hợp đồng từ Tổng quan
    await page.waitForFunction(() => /Hợp đồng \d{3}-\d{4}\/HD/.test(document.querySelector('#title').textContent));
    await page.click('#nav a[data-go="hdhan"]');
    await page.waitForSelector('tbody tr[data-i]');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 2);
    const dong = await page.locator('tbody tr[data-i]').allTextContents();
    assert.ok(/Quá Hạn/.test(dong[0]) && /Quá 1 ngày/.test(dong[0]) && /Công ty Hạn/.test(dong[1]) && /Còn 10 ngày/.test(dong[1]), dong.join('|'));
    await page.selectOption('select[data-f="loc"]', 'sap');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 1);
    await page.selectOption('select[data-f="loc"]', 'het');
    assert.match(await page.locator('tbody tr[data-i]').first().textContent(), /Quá Hạn/);
    await shot(page, 'hd-9-sap-het-han');
    // gia hạn: sửa ngày hết hạn thì hợp đồng rời khỏi danh sách
    await page.locator('tbody tr[data-i]').first().click();
    await page.waitForSelector('input[data-h="NgayHetHan"]');
    await page.fill('input[data-h="NgayHetHan"]', await page.evaluate(() => iso(new Date(Date.now() + 365 * 864e5))));
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => !S.dirty);
    await page.click('#nav a[data-go="hdhan"]');
    await page.waitForSelector('text=Không có dữ liệu phù hợp'); // bộ lọc "Đã hết hạn" vẫn giữ, mà hợp đồng quá hạn đã được gia hạn
    await page.selectOption('select[data-f="loc"]', '');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 1);
    assert.strictEqual((await page.locator('#nav a[data-go="hdhan"] .cnt').textContent()).trim(), '1');
  }]);

  BUOC.push(['Hợp đồng: tạo file Google Docs, file cũ khi sửa, tải PDF', async page => {
    await page.evaluate(() => go('hopdong'));
    await page.locator('tbody tr[data-i]', { hasText: 'Anh Minh' }).first().click();
    await page.waitForSelector('text=Chưa tạo file');
    await page.click('[data-act="taofile"]');
    await page.waitForSelector('text=/Đã tạo \\d{4}-/');
    assert.ok(await page.locator('#toast', { hasText: 'Đã tạo file hợp đồng' }).count() >= 1);
    assert.ok(await page.locator('a:has-text("Mở Google Docs")').count() === 1, 'Quản trị thấy nút mở Google Docs');
    await shot(page, 'hd-5-co-file');
    await page.fill('input[data-h="DiaChi"]', 'Địa chỉ mới 99');
    await nut(page, 'Lưu').click();
    await page.waitForSelector('text=Đã cũ: hợp đồng đã sửa sau lần tạo file');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('[data-act="pdf"]')]);
    assert.match(dl.suggestedFilename(), /^Hợp đồng .*\.pdf$/, 'tên tải về: ' + dl.suggestedFilename());
    await page.waitForSelector('text=/Đã tạo \\d{4}-/'); // tải PDF đã tạo lại file cho khớp nội dung mới
    assert.strictEqual(await page.evaluate(() => S.hd.FileCu), '');
    await page.evaluate(() => go('hopdong'));
    assert.ok(await page.locator('tbody tr', { hasText: 'có file' }).count() >= 1);
  }]);

  BUOC.push(['Cài đặt: mẫu hợp đồng, danh sách biến, ngân hàng lấy từ máy chủ', async page => {
    await page.click('#nav a[data-go="caidat"]');
    await page.waitForSelector('text=Mẫu hợp đồng (Google Docs)');
    assert.strictEqual(await page.locator('.card:has-text("Mẫu hợp đồng (Google Docs)") table.mini tr').count(), 6);
    await shot(page, 'hd-6-cai-dat-mau');
    await page.click('[data-act="mau-bien"]');
    await page.waitForSelector('code:has-text("{{TENDOANHNGHIEP}}")');
    assert.ok(await page.locator('#modal code').count() > 25);
    await page.keyboard.press('Escape');
    await page.click('[data-act="mau-them"]');
    await page.fill('#modal [name=LoaiHD]', 'Hợp đồng thử');
    await page.fill('#modal [name=LinkMau]', 'abc');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#toast .err');
    assert.match(await page.locator('#toast .err').first().textContent(), /Dán link/i);
    await page.keyboard.press('Escape');
    await page.click('[data-act="mau-macdinh"]');
    await page.waitForSelector('text=Đã đủ mẫu mặc định');
    await page.click('[data-act="shop"]');
    await page.waitForSelector('#modal select[name=qrNganHang]');
    assert.ok(await page.locator('#modal select[name=qrNganHang] option').count() > 30, 'Danh sách ngân hàng phải lấy được từ máy chủ');
    await page.keyboard.press('Escape');
  }]);

  BUOC.push(['Hợp đồng: lập từ đơn hàng, nhân bản', async page => {
    await page.evaluate(async () => {
      await api('luuChungTu', 'DH', { Ngay: today(), MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 10, lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', DVT: 'Máy', SoLuong: 3, DonGia: 11300000 }] });
      await loadAll(); await openDoc('DH', S.donHang[0]);
    });
    await nut(page, 'Tạo hợp đồng').click();
    await page.waitForSelector('input[data-h="TenDN"]');
    assert.strictEqual(await page.inputValue('input[data-h="TenDN"]'), 'Anh Minh');
    assert.match(await page.inputValue('select[data-h="SoDH"]'), /^\d{3}-\d{4}\/DH$/);
    assert.match(await page.inputValue('tr[data-i="0"] [data-f="TenHang"]'), /iPhone 15/);
    assert.strictEqual(so(await page.locator('[data-t="tong"]').textContent()), '37290000'); // 3 x 11.300.000 + 10%
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => /Hợp đồng \d{3}-\d{4}\/HD/.test(document.querySelector('#title').textContent), null, { timeout: 8000 });
    const so1 = await page.evaluate(() => S.hd.SoHD);
    assert.ok((await page.evaluate(() => S.hd.SoDH)).length > 0, 'Hợp đồng phải gắn với đơn hàng');
    await nut(page, 'Nhân bản').click();
    await page.waitForFunction(() => document.querySelector('#title').textContent.startsWith('Hợp đồng mới'));
    assert.strictEqual(so(await page.locator('[data-t="tong"]').textContent()), '37290000');
    assert.strictEqual(await page.inputValue('input[data-h="NgayHetHan"]'), '');
    await nut(page, 'Lưu').click();
    await page.waitForFunction(old => /Hợp đồng \d{3}-\d{4}\/HD/.test(document.querySelector('#title').textContent) && !document.querySelector('#title').textContent.includes(old), so1, { timeout: 8000 });
  }]);

  BUOC.push(['Hợp đồng: tạo hàng loạt từ nhiều hợp đồng nguồn', async page => {
    await page.evaluate(() => go('hopdong'));
    const truoc = await page.evaluate(() => S.hopDong.length);
    await nut(page, 'Tạo hàng loạt').click();
    await page.waitForSelector('#modal [data-list] [data-so]');
    await page.fill('#modal [data-q]', 'anh minh');
    const nguon = await page.locator('#modal [data-list] [data-so]').count();
    assert.ok(nguon >= 3, 'Phải tìm thấy các hợp đồng của Anh Minh: ' + nguon);
    await page.click('#modal [data-all]');
    assert.strictEqual(Number(await page.locator('#modal [data-n]').textContent()), nguon);
    await page.selectOption('#modal select[name=loai]', 'Hợp đồng nguyên tắc');
    await shot(page, 'hd-7-hang-loat');
    await page.click('#modal [data-b="0"]');
    await page.waitForSelector('text=/Xong: tạo được \\d+\\/\\d+ hợp đồng/', { timeout: 20000 });
    assert.ok(await page.locator('#modal [data-kq]', { hasText: `tạo được ${nguon}/${nguon}` }).count() === 1);
    const moi = await page.evaluate(() => S.hopDong.filter(h => h.LoaiHD === 'Hợp đồng nguyên tắc'));
    assert.strictEqual(moi.length, nguon);
    assert.ok(moi.every(h => h.FileId && h.TrangThai === 'Soạn thảo' && !h.NgayHetHan), 'Mỗi hợp đồng mới có file, ở trạng thái soạn thảo, chưa có ngày hết hạn');
    assert.strictEqual(await page.evaluate(() => S.hopDong.length), truoc + nguon);
    await shot(page, 'hd-8-hang-loat-xong');
    await page.keyboard.press('Escape');
    await page.selectOption('select[data-f="loai"]', 'Hợp đồng nguyên tắc');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), nguon);
    // không chọn gì thì báo lỗi
    await nut(page, 'Tạo hàng loạt').click();
    await page.click('#modal [data-b="0"]');
    await page.waitForSelector('#toast .err');
    await page.keyboard.press('Escape');
  }]);

  BUOC.push(['Hợp đồng: báo trước, tự gia hạn, IMEI, CCCD; gia hạn một chạm; lịch sử', async page => {
    await page.evaluate(() => newHD());
    await page.waitForSelector('input[data-h="TenDN"]');
    assert.strictEqual(await page.inputValue('input[data-h="BaoTruocNgay"]'), '30'); // mặc định báo trước 30 ngày
    await page.fill('input[data-h="TenDN"]', 'Khách Mới Một');
    await page.fill('input[data-h="SoCCCD"]', '079123456789');
    await page.fill('input[data-h="CCCDCap"]', '01/01/2021 – CA TP.HCM');
    await page.fill('input[data-h="BaoTruocNgay"]', '20');
    await page.selectOption('select[data-h="TuGiaHan"]', '1');
    assert.strictEqual(await page.inputValue('input[data-h="ThangGiaHan"]'), '12'); // chọn tự gia hạn thì mặc định 12 tháng
    await page.selectOption('select[data-h="TrangThai"]', 'Đang hiệu lực');
    await page.fill('input[data-h="NgayHetHan"]', await page.evaluate(() => iso(new Date(Date.now() + 40 * 864e5))));
    await page.fill('tr[data-i="0"] [data-f="TenHang"]', 'Máy thử IMEI');
    await page.keyboard.press('Escape');
    await page.fill('tr[data-i="0"] [data-f="IMEI"]', '356789012345671');
    await page.press('tr[data-i="0"] [data-f="IMEI"]', 'Enter'); // máy quét: Enter thêm dấu phẩy để quét tiếp
    assert.strictEqual(await page.inputValue('tr[data-i="0"] [data-f="IMEI"]'), '356789012345671, ');
    await page.type('tr[data-i="0"] [data-f="IMEI"]', '356789012345672');
    assert.strictEqual(await page.inputValue('tr[data-i="0"] [data-f="SoLuong"]'), '2'); // số lượng đếm theo số mã
    await page.fill('tr[data-i="0"] [data-f="DonGia"]', '10000000');
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => S.hd && S.hd.SoHD && !S.dirty, null, { timeout: 8000 });
    const luu = await page.evaluate(() => { const h = S.hopDong.find(x => x.SoHD === S.hd.SoHD); return [h.BaoTruocNgay, h.TuGiaHan, h.ThangGiaHan, h.SoCCCD, h.IMEI, h.TongCong]; });
    assert.deepStrictEqual(luu, [20, '1', 12, '079123456789', '356789012345671, 356789012345672', 20000000]);
    // gia hạn một chạm ngay trong màn hình soạn
    const hetTruoc = await page.evaluate(() => S.hd.NgayHetHan);
    await nut(page, 'Gia hạn').click();
    await page.waitForSelector('#modal [data-pv]');
    assert.match(await page.locator('#modal [data-pv]').textContent(), /Hết hạn hiện tại .* → mới /);
    await page.fill('#modal [name=thang]', '3');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' }); // chờ hộp thoại đóng (thông báo của bước trước có thể còn hiện nên không dựa vào nó)
    assert.strictEqual(await page.evaluate(() => S.hd.NgayHetHan), await page.evaluate(h => congThangISO(h, 3), hetTruoc));
    // lịch sử theo hợp đồng
    await page.click('details[data-ls] summary');
    await page.waitForSelector('[data-lsbody] table.mini');
    const ls = await page.locator('[data-lsbody]').textContent();
    assert.ok(/Gia hạn hợp đồng/.test(ls) && /Thêm hợp đồng/.test(ls), ls);
    assert.ok(/thêm 3 tháng/.test(ls));
    await shot(page, 'hd-11-bao-truoc-imei-lich-su');
  }]);

  BUOC.push(['Hợp đồng: hạn báo trước, nhắc khách qua Zalo/email, nút trong dòng không mở hợp đồng', async page => {
    await page.evaluate(async () => {
      await api('luuHopDong', { LoaiHD: 'Hợp đồng nguyên tắc', TenDN: 'Công ty Báo Trước', NguoiDaiDien: 'Lê Văn C', SDT: '0912 345 678 / 0988000111', TrangThai: 'Đang hiệu lực', BaoTruocNgay: 60, TuGiaHan: '1', ThangGiaHan: 6,
        NgayHieuLuc: iso(new Date(Date.now() - 300 * 864e5)), NgayHetHan: iso(new Date(Date.now() + 50 * 864e5)), VAT: 0, lines: [] });
      await loadAll(); go('hdhan');
    });
    const dong = page.locator('tbody tr[data-i]', { hasText: 'Công ty Báo Trước' });
    await dong.waitFor();
    assert.match(await dong.textContent(), /quá 10 ngày/); // còn 50 ngày nhưng hạn báo trước (60 ngày) đã qua 10 ngày
    assert.match(await dong.textContent(), /Tự gia hạn 6 tháng/);
    await dong.locator('[data-act="nhac"]').click();
    await page.waitForSelector('#modal [data-tin]');
    assert.match(await page.locator('#title').textContent(), /sắp hết hạn/); // nút trong dòng không mở hợp đồng
    const tin = await page.inputValue('#modal [data-tin]');
    assert.ok(/Chào anh\/chị Lê Văn C/.test(tin) && /báo trước 60 ngày/.test(tin) && /tự động gia hạn thêm 6 tháng/.test(tin) && /\d{3}-\d{4}\/HD/.test(tin), tin);
    assert.strictEqual(await page.getAttribute('#modal [data-zalo]', 'href'), 'https://zalo.me/84912345678'); // lấy số đầu, đổi 0 thành 84
    await page.fill('#modal [data-tin]', 'Tin đã sửa & có dấu');
    assert.match(await page.getAttribute('#modal [data-mail]', 'href'), /^mailto:\?subject=.*&body=Tin%20%C4%91%C3%A3%20s%E1%BB%ADa%20%26%20c%C3%B3%20d%E1%BA%A5u$/); // khách chưa có email
    await page.click('#modal [data-copy]');
    await page.waitForSelector('#toast >> text=/sao chép|Ctrl\\+C/');
    await shot(page, 'hd-12-nhac-khach');
    await page.keyboard.press('Escape');
    await dong.locator('[data-act="giahan"]').click();
    await page.waitForSelector('#modal [name=thang]');
    assert.strictEqual(await page.inputValue('#modal [name=thang]'), '6'); // mặc định theo số tháng của hợp đồng
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' }); // chờ hộp thoại đóng (thông báo của bước trước có thể còn hiện nên không dựa vào nó)
    assert.match(await page.locator('#title').textContent(), /sắp hết hạn/);
    assert.strictEqual(await page.locator('tbody tr[data-i]', { hasText: 'Công ty Báo Trước' }).count(), 0); // gia hạn 6 tháng: còn 230 ngày, rời danh sách
  }]);

  BUOC.push(['Lịch thanh toán: tạo trả góp, lưu, ghi nhận thu thành phiếu thu, nhắc, màn hình riêng, hủy thu', async page => {
    const so = await page.evaluate(() => S.hopDong.find(h => h.SoDH && h.TrangThai === 'Soạn thảo').SoHD);
    await page.evaluate(h => openHD(S.hopDong.find(x => x.SoHD === h)), so);
    await page.waitForSelector('[data-gen="soKy"]');
    const tong = await page.evaluate(() => hdTotal().tong);
    assert.strictEqual(tong, 37290000);
    await page.fill('[data-gen="traTruoc"]', '10000000');
    await page.fill('[data-gen="soKy"]', '3');
    await page.fill('[data-gen="ngayDau"]', await page.evaluate(() => iso(new Date(Date.now() - 864e5)))); // kỳ 1 đã quá hạn 1 ngày
    await page.click('[data-act="lich-tao"]');
    const so4 = await page.locator('[data-lich] tbody tr').count();
    assert.strictEqual(so4, 4);
    const tien = await page.locator('[data-lf="SoTien"]').evaluateAll(els => els.map(e => e.value.replace(/\D/g, '')));
    assert.deepStrictEqual(tien, ['10000000', '9096666', '9096666', '9096668']); // số dư lẻ dồn vào kỳ cuối
    assert.match(await page.locator('[data-lc]').textContent(), /Khớp giá trị hợp đồng/);
    const oTien = page.locator('tr[data-lr="2"] [data-lf="SoTien"]');
    await oTien.fill(''); await oTien.fill('9000000'); // sửa tay một đợt: hiện chênh lệch ngay (ô tiền của app bỏ vùng chọn khi bấm vào, nên xóa trước rồi nhập)
    assert.match(await page.locator('[data-lc]').textContent(), /Chênh 96\.666/);
    await oTien.fill(''); await oTien.fill('9096666');
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => !S.dirty && S.hd.lich.every(r => r.Dot), null, { timeout: 8000 });
    assert.strictEqual(await page.evaluate(h => S.hopDongLich.filter(r => r.SoHD === h).length, so), 4);
    await shot(page, 'hd-13-lich-thanh-toan');
    // Tổng quan và menu có đợt cần thu (kỳ 1 quá hạn)
    await page.evaluate(() => go('home'));
    assert.strictEqual((await page.locator('#nav a[data-go="hdlich"] .cnt').textContent()).trim(), '2'); // Trả trước đến hạn hôm nay + Kỳ 1 quá hạn 1 ngày
    assert.ok(/Kỳ 1\/3/.test(await page.locator('.card:has-text("Đợt thanh toán cần thu")').textContent()));
    await page.evaluate(h => openHD(S.hopDong.find(x => x.SoHD === h)), so);
    await page.waitForSelector('[data-act="lich-thu"]');
    // Ghi nhận thu đợt Trả trước -> phiếu thu theo đơn hàng, công nợ giảm
    const thuTruoc = await page.evaluate(h => { const d = S.hopDong.find(x => x.SoHD === h); return [S.thuTien.length, D.thuDH[d.SoDH] || 0]; }, so);
    // sau khi lưu lịch xếp theo ngày đến hạn: hàng 0 = Kỳ 1/3 (hôm qua), hàng 1 = Trả trước (hôm nay)
    await page.locator('tr[data-lr="1"] [data-act="lich-thu"]').click();
    await page.waitForSelector('#modal [name=HinhThuc]');
    assert.match(await page.locator('#modal .box-h').textContent(), /Thu Trả trước/);
    await page.fill('#modal [name=GhiChu]', 'khách chuyển khoản');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' });
    const thuSau = await page.evaluate(h => { const d = S.hopDong.find(x => x.SoHD === h); return [S.thuTien.length, D.thuDH[d.SoDH] || 0, S.hd.lich[1].SoPT]; }, so);
    assert.strictEqual(thuSau[0], thuTruoc[0] + 1);
    assert.strictEqual(thuSau[1], thuTruoc[1] + 10000000); // công nợ của đơn giảm đúng 10 triệu
    assert.match(thuSau[2], /^\d{3}-\d{4}\/PT$/);
    assert.ok(/Đã thu/.test(await page.locator('tr[data-lr="1"]').textContent()) && await page.locator('tr[data-lr="1"] input').count() === 0, 'Đợt đã thu không sửa được');
    // Nhắc đợt quá hạn
    await page.locator('tr[data-lr="0"] [data-act="lich-nhac"]').click();
    await page.waitForSelector('#modal [data-tin]');
    const tin = await page.inputValue('#modal [data-tin]');
    assert.ok(/Kỳ 1\/3/.test(tin) && /đã quá hạn 1 ngày/.test(tin) && /9\.096\.666 đồng/.test(tin), tin);
    await page.keyboard.press('Escape');
    // Màn hình Lịch thanh toán: thu ngay từ danh sách
    await page.click('#nav a[data-go="hdlich"]');
    await page.waitForSelector('tbody tr[data-i]');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 1);
    assert.match(await page.locator('tbody tr[data-i]').first().textContent(), /Kỳ 1\/3.*Quá hạn 1 ngày/s);
    await page.locator('tbody tr[data-i] [data-act="thu"]').click();
    assert.match(await page.locator('#title').textContent(), /Lịch thanh toán/); // nút trong dòng không mở hợp đồng
    await page.waitForSelector('#modal [name=HinhThuc]');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' });
    await page.waitForSelector('text=Không có dữ liệu phù hợp');
    assert.strictEqual(await page.evaluate(() => dotCanThu().length), 0);
    await page.selectOption('select[data-f="loc"]', 'thu');
    assert.strictEqual(await page.locator('tbody tr[data-i]').count(), 2);
    await page.selectOption('select[data-f="loc"]', 'can');
    // Danh sách hợp đồng có tiến độ thu; hủy thu (quản trị) đưa đợt về chưa thu và xóa phiếu
    await page.evaluate(() => go('hopdong'));
    assert.ok(await page.locator('tbody tr', { hasText: 'Đã thu 2/4 đợt' }).count() === 1);
    await page.evaluate(h => openHD(S.hopDong.find(x => x.SoHD === h)), so);
    await page.waitForSelector('[data-act="lich-huy"]');
    const truocHuy = await page.evaluate(() => S.thuTien.length);
    await page.locator('tr[data-lr="0"] [data-act="lich-huy"]').click(); // hủy thu Kỳ 1/3; hộp thoại xác nhận được tự chấp nhận
    await page.waitForFunction(n => S.thuTien.length === n - 1, truocHuy);
    assert.strictEqual(await page.evaluate(() => S.hd.lich.filter(r => r.SoPT).length), 1);
    assert.strictEqual(await page.evaluate(() => dotCanThu().length), 1); // kỳ 1 quá hạn trở lại
  }]);

  BUOC.push(['Ký tại quầy: chỉ ký khi đã có file mới, kiểm tra đầu vào, ký, khóa nội dung, kiểm tra và hủy chữ ký', async page => {
    await page.evaluate(() => newHD());
    await page.waitForSelector('input[data-h="TenDN"]');
    await page.fill('input[data-h="TenDN"]', 'Khách Ký Tại Quầy');
    await page.fill('input[data-h="NguoiDaiDien"]', 'Trần Thị Ký');
    await page.fill('tr[data-i="0"] [data-f="TenHang"]', 'Máy thử chữ ký');
    await page.keyboard.press('Escape');
    await page.fill('tr[data-i="0"] [data-f="SoLuong"]', '1');
    await page.fill('tr[data-i="0"] [data-f="DonGia"]', '5000000');
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => S.hd && S.hd.SoHD && !S.dirty, null, { timeout: 8000 });
    const so = await page.evaluate(() => S.hd.SoHD);
    await page.waitForSelector('[data-act="taofile"]');
    assert.ok(await page.locator('[data-act="ky"]').isDisabled(), 'Chưa có file thì chưa cho ký');
    assert.ok(await page.locator('text=Tạo file hợp đồng trước để khách xem đúng bản sẽ ký.').count() >= 1);
    await page.click('[data-act="taofile"]');
    await page.waitForSelector('text=/Đã tạo \\d{4}-/');
    assert.ok(await page.locator('[data-act="ky"]').isEnabled(), 'Có file mới thì được ký');
    await page.fill('input[data-h="GhiChu"]', 'sửa dở'); // đang sửa dở chưa lưu: không cho ký
    assert.ok(await page.evaluate(() => S.dirty));
    await page.click('[data-act="ky"]');
    await page.waitForSelector('#toast .err');
    assert.match(await page.locator('#toast .err').last().textContent(), /Lưu hợp đồng trước khi ký/);
    assert.strictEqual(await page.locator('#modal canvas[data-pad]').count(), 0);
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => !S.dirty, null, { timeout: 8000 });
    await page.waitForSelector('text=Đã cũ: hợp đồng đã sửa sau lần tạo file'); // lưu GhiChu làm file cũ: phải tạo lại file
    assert.ok(await page.locator('[data-act="ky"]').isDisabled(), 'File đã cũ thì chưa cho ký');
    await page.click('[data-act="taofile"]');
    await page.waitForSelector('text=/Đã tạo \\d{4}-/');
    await page.click('[data-act="ky"]');
    await page.waitForSelector('#modal canvas[data-pad]');
    const ky = () => page.click('#modal [data-save]');
    const loi = async re => { await page.waitForSelector('#toast .err'); assert.match(await page.locator('#toast .err').last().textContent(), re); await page.evaluate(() => document.querySelectorAll('#toast .err').forEach(x => x.remove())); };
    await ky(); await loi(/chưa ký vào khung/);
    const hop = await page.locator('#modal canvas[data-pad]').boundingBox();
    const ve = async () => { // ký một nét ngoằn ngoèo bằng chuột
      await page.mouse.move(hop.x + 40, hop.y + 100); await page.mouse.down();
      for (let i = 0; i <= 30; i++) await page.mouse.move(hop.x + 40 + i * 12, hop.y + 100 + Math.sin(i / 2) * 50);
      await page.mouse.up();
    };
    await ve(); await ky(); await loi(/xác nhận khách đã đọc/);
    await page.locator('#modal [data-clear]').click(); // xóa nét ký: lại báo chưa ký
    await ky(); await loi(/chưa ký vào khung/);
    await ve();
    await shot(page, 'hd-14-ky-tai-quay');
    await page.fill('#modal [name=ten]', '');
    await ky(); await loi(/họ tên người ký/);
    await page.fill('#modal [name=ten]', 'Trần Thị Ký');
    await page.check('#modal [name=dongy]');
    await ky();
    await page.waitForSelector('#modal', { state: 'hidden' });
    await page.waitForSelector('text=/Đã ký: Trần Thị Ký/');
    assert.strictEqual(await page.evaluate(() => S.hd.TrangThai), 'Đang hiệu lực');
    assert.ok(await page.locator('[data-act="ky"]').count() === 0, 'Đã ký thì không còn nút ký');
    assert.match(await page.locator('.card:has-text("Chữ ký điện tử")').textContent(), /Mã xác thực [0-9A-F]{4}-[0-9A-F]{4}-/);
    await shot(page, 'hd-15-da-ky');
    // Nội dung bị khóa, kể cả với quản trị
    await page.fill('input[data-h="DiaChi"]', 'Đổi địa chỉ sau khi ký');
    await nut(page, 'Lưu').click();
    await page.waitForSelector('#toast .err');
    assert.match(await page.locator('#toast .err').last().textContent(), /đã có chữ ký điện tử/);
    await page.evaluate(h => openHD(S.hopDong.find(x => x.SoHD === h)), so); // bỏ thay đổi dở
    await page.waitForSelector('[data-act="ky-xt"]');
    await page.click('[data-act="ky-xt"]');
    await page.waitForSelector('#toast:has-text("Chữ ký hợp lệ")');
    // Hủy chữ ký (quản trị): nội dung sửa được lại và có thể ký lại
    await page.click('[data-act="ky-huy"]');
    await page.waitForSelector('text=Chưa ký');
    assert.ok(await page.locator('[data-act="ky"]').count() === 1);
    assert.ok(await page.evaluate(h => !S.hopDong.find(x => x.SoHD === h).KyFileId, so));
    await page.fill('input[data-h="DiaChi"]', 'Địa chỉ sửa được lại');
    await nut(page, 'Lưu').click();
    await page.waitForFunction(() => !S.dirty, null, { timeout: 8000 });
  }]);

  BUOC.push(['Cài đặt: email tổng hợp mỗi sáng (bật, kiểm tra nhập, gửi thử, tắt)', async page => {
    await page.click('#nav a[data-go="caidat"]');
    const the = page.locator('.card:has-text("Email tổng hợp mỗi sáng")');
    await the.waitFor();
    assert.ok(/Đang tắt/.test(await the.textContent()));
    await the.locator('[data-act="es-thu"]').click();
    await page.waitForSelector('#toast:has-text("Đã gửi thư thử tới chu@example.com")');
    await the.locator('[data-act="es-sua"]').click();
    await page.waitForSelector('#modal [name=den]');
    await page.selectOption('#modal [name=bat]', '1');
    await page.selectOption('#modal [name=gio]', '6');
    await page.fill('#modal [name=den]', 'khong-phai-email');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#toast .err:has-text("Email không hợp lệ")');
    await page.fill('#modal [name=den]', 'quanly@example.com, ketoan@example.com');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' });
    await page.waitForSelector('.card:has-text("Đang bật · 6:00 mỗi sáng")');
    assert.ok(/quanly@example\.com, ketoan@example\.com/.test(await the.textContent()));
    assert.deepStrictEqual(await page.evaluate(() => S.emailSang), { bat: true, gio: 6, den: ['quanly@example.com', 'ketoan@example.com'] });
    await shot(page, 'hd-16-email-sang');
    await the.locator('[data-act="es-sua"]').click();
    await page.selectOption('#modal [name=bat]', '');
    await page.click('#modal [data-save]');
    await page.waitForSelector('#modal', { state: 'hidden' });
    await page.waitForSelector('.card:has-text("Đang tắt")');
    assert.strictEqual(await page.evaluate(() => S.emailSang.bat), false);
  }]);

  BUOC.push(['Hợp đồng: màn hình điện thoại không tràn ngang', async page => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => newHD());
    await page.waitForSelector('input[data-h="TenDN"]');
    await page.waitForTimeout(500); // chờ ngăn menu trượt xong
    const tran = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await shot(page, 'hd-4-dien-thoai');
    assert.ok(tran <= 1, 'Trang tràn ngang ' + tran + 'px trên điện thoại');
    await page.setViewportSize({ width: 1280, height: 900 });
  }]);
};

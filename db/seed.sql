USE kalasetu;

-- ================================================================
-- USERS (passwords are bcrypt of the shown plaintext)
-- Admin@123 bcrypt hash
-- ================================================================
INSERT INTO users (name, email, password_hash, role, phone, is_business, business_name, status) VALUES
('Admin Kalasetu', 'admin@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'ADMIN', '9000000001', 0, NULL, 'ACTIVE'),
('Priya Sharma', 'consultant@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'CONSULTANT', '9000000002', 0, NULL, 'ACTIVE'),
('Ramesh Netam', 'ramesh@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'ARTISAN', '9000000003', 0, NULL, 'ACTIVE'),
('Lalita Badyakar', 'lalita@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'ARTISAN', '9000000004', 0, NULL, 'ACTIVE'),
('Suresh Hengami', 'suresh@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'ARTISAN', '9000000005', 0, NULL, 'ACTIVE'),
('Kamla Pardhiyan', 'kamla@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'ARTISAN', '9000000006', 0, NULL, 'ACTIVE'),
('Ananya Mehta', 'customer1@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'CUSTOMER', '9000000007', 0, NULL, 'ACTIVE'),
('Vikram Joshi', 'customer2@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'CUSTOMER', '9000000008', 0, NULL, 'ACTIVE'),
('Terra Decor Imports', 'business@kalasetu.in', '$2b$10$o0OkO1.guGRiILNvsp4HquPmd6L1nk6.9qsUiXqLoupWPJ52ZJKt.', 'CUSTOMER', '9000000009', 1, 'Terra Decor Imports', 'ACTIVE');

-- ================================================================
-- ARTISAN PROFILES  (user_ids 3,4,5,6)
-- ================================================================
INSERT INTO artisan_profiles (user_id, tribe_name, region, craft_tradition, story, years_experience) VALUES
(3, 'Ojha', 'Bastar, Chhattisgarh', 'Dhokra metal casting',
 'Ramesh Netam is a fifth-generation Dhokra artisan from Kondagaon, Bastar. His ancestors perfected the lost-wax casting technique over four millennia, pouring molten brass into clay moulds to create deities, animals, and tribal motifs. Ramesh learned the craft by firelight as a child, watching his grandfather shape the wax cores that give each piece its soul. Today he combines ancestral forms with contemporary sensibilities, ensuring that every piece carries the warmth and weight of living tradition.',
 22),
(4, 'Warli', 'Palghar, Maharashtra',  'Warli painting',
 'Lalita Badyakar grew up in the foothills of the Sahyadri range, where Warli painting is not art but prayer. Using a bamboo twig as a brush and rice paste on handmade paper, she renders the geometry of Warli cosmology: concentric circles for the universe, triangles for man and woman, and the tarpa dance that links the community in celebration. Her work has been shown at the Crafts Museum, New Delhi, and she now mentors younger women in the village, keeping the tradition alive.',
 18),
(5, 'Gondi', 'Dindori, Madhya Pradesh', 'Gond painting',
 'Suresh Hengami is a self-taught Gond painter who inherited his visual vocabulary from generations of oral storytelling. The Gond people believe that a keen observation of nature brings good luck; Suresh captures this in vibrant compositions of peacocks, sacred trees, and river goddesses rendered in the characteristic dotted and dashed line work. He paints on paper, canvas, and increasingly on upcycled fabric, and his bold palette of natural pigments — turmeric yellow, indigo blue, and charcoal black — has earned him recognition from the Madhya Pradesh Tribal Arts Academy.',
 14),
(6, 'Lambani', 'Vijayanagara, Karnataka', 'Lambani/Banjara embroidery',
 'Kamla Pardhiyan belongs to the Lambani (Banjara) nomadic community and has been embroidering since she was eight years old. Lambani needlework is a language of geometric motifs, mirrors, and vibrant thread that historically adorned the robes of Banjara women journeying across the Deccan. Kamla incorporates this intricate patchwork into blouses, wall hangings, and bags that carry the memory of those long migrations — every stitch a word in a story passed down through women for centuries.',
 27);

-- ================================================================
-- CATEGORIES
-- ================================================================
INSERT INTO categories (name, slug, description) VALUES
('Metal Craft',            'metal-craft',       'Dhokra, bell metal, and tribal metalwork from Central India'),
('Paintings',              'paintings',          'Warli, Gond, Madhubani, and other tribal painting traditions'),
('Textiles & Embroidery',  'textiles-embroidery','Hand-woven fabrics and intricate tribal embroidery'),
('Bamboo & Cane',          'bamboo-cane',        'Sustainable basketry and utility items from forest communities'),
('Pottery & Terracotta',   'pottery-terracotta', 'Hand-thrown and tribal terracotta from village kilns'),
('Jewellery',              'jewellery',          'Tribal silver, seed, and bead jewellery');

-- ================================================================
-- PRODUCTS  (artisan_ids: Ramesh=3, Lalita=4, Suresh=5, Kamla=6)
-- Categories: Metal=1, Paintings=2, Textiles=3, Bamboo=4, Pottery=5, Jewellery=6
-- ================================================================
INSERT INTO products (artisan_id, category_id, name, slug, description, craft_technique, materials, price, stock, status, is_featured, cultural_notes) VALUES
-- Ramesh — Dhokra
(3, 1, 'Dhokra Bull Figurine', 'dhokra-bull-figurine',
 'A powerfully rendered bull cast using the ancient Dhokra lost-wax process. The beast embodies Nandi, the divine vehicle of Shiva, and is a staple of tribal homes during Hariyali Amavasya. Each piece is unique — the clay mould is broken to release it, so no two are identical.',
 'Lost-wax (cire-perdue) casting', 'Brass alloy, clay core, beeswax', 2800.00, 15, 'APPROVED', 1,
 'Dhokra is one of the oldest non-ferrous metal casting traditions in the world, practised by the Ojha metalsmiths of Bastar for over 4,000 years. The process involves sculpting a wax model, encasing it in clay, then pouring molten brass — creating artefacts that are simultaneously functional and sacred. The Dhokra Bull specifically represents prosperity and agricultural strength in the Gondi cosmology of Central India.'),

(3, 1, 'Dhokra Ganesha', 'dhokra-ganesha',
 'A seated Ganesha in traditional Dhokra style, with characteristic decorative granules and a serene expression. Hand-cast in Kondagaon, Bastar, this piece makes an auspicious housewarming gift.',
 'Lost-wax casting', 'Brass alloy', 3500.00, 8, 'APPROVED', 0,
 'The depiction of Ganesha in Dhokra reflects the syncretic spiritual landscape of Bastar, where Hindu iconography merged with tribal animism over centuries. Dhokra Ganesha figures are often installed at the entrance of homes and workshops as guardians against obstacles — a belief shared across both the Ojha smithing community and neighbouring Hindu farming castes.'),

(3, 1, 'Dhokra Tribal Mask', 'dhokra-tribal-mask',
 'A striking wall-mounted tribal mask in brass, depicting a forest deity with bulging eyes and ceremonial headdress. Size approximately 20×15 cm.',
 'Lost-wax casting', 'Brass alloy', 4200.00, 5, 'APPROVED', 0,
 'Masks in Dhokra tradition represent forest guardians (Dev-Devtas) invoked during the Bastar Dussehra, one of India\'s longest tribal festivals spanning 75 days. These faces are not mere decorations; they are intermediaries between the human and spirit worlds.'),

(3, 1, 'Dhokra Elephant Pair', 'dhokra-elephant-pair',
 'Two brass elephants face each other in the traditional Dhokra gift-set format. A beloved wedding and house-warming present across Central India.',
 'Lost-wax casting', 'Brass alloy', 5200.00, 3, 'PENDING_REVIEW', 0, NULL),

-- Lalita — Warli
(4, 2, 'Warli Wedding Dance Painting', 'warli-wedding-dance-painting',
 'A large (60×45 cm) Warli painting on hand-made paper depicting the Tarpa dance that is performed at weddings. Rendered in authentic rice-paste on earth-toned paper. Framing recommended.',
 'Rice-paste on handmade paper', 'Rice paste, natural earth pigments, handmade paper', 1800.00, 20, 'APPROVED', 1,
 'The Warli tribe of Palghar, Maharashtra, have painted on the walls of their mud homes for over 2,500 years using geometric figures — circles, triangles, and squares — that map the Warli cosmos. The Tarpa dance circle, always centred on a conch-shell flute player, symbolises the cyclical nature of life, harvest, and community. This painting tradition was brought to international attention in the 1970s by Jivya Soma Mashe, whose work is now in major museums worldwide.'),

(4, 2, 'Warli Forest Spirit', 'warli-forest-spirit',
 'A medium (40×30 cm) Warli composition showing a large Waghia (tiger deity) surrounded by tribal hunters and village scenes. Made with rice paste on mud-washed cloth.',
 'Rice-paste on cloth', 'Rice paste, mud wash, cotton cloth', 1200.00, 12, 'APPROVED', 0,
 'Waghia, the tiger deity, is propitiated by Warli farmers before the hunting season and during times of crop disease. These votive paintings are traditionally made on the walls of the designated marriage house (Chavdi) and are not signed — the artist is a vessel for communal memory, not an individual creator.'),

(4, 2, 'Warli Harvest Scene — Set of 4', 'warli-harvest-set',
 'Four postcard-size (15×10 cm) Warli paintings showing the rice-harvesting cycle: sowing, growing, reaping, and celebrating. Perfect for gifting or framing as a series.',
 'Rice-paste on paper', 'Rice paste, natural earth paper', 900.00, 30, 'APPROVED', 0,
 'The agricultural cycle is central to Warli iconography; each stage of rice cultivation — from the first sowing rain to the Navratri harvest thanksgiving — has its own ceremonial painting vocabulary. Collecting all four scenes captures the full agrarian calendar of the Sahyadri foothills.'),

(4, 2, 'Warli Village Life', 'warli-village-life',
 'A panoramic Warli painting (80×40 cm) on canvas showing village daily life: fishing, cooking, children playing, and the evening storytelling circle.',
 'Rice-paste on canvas', 'Rice paste, acrylic sealant, cotton canvas', 2400.00, 4, 'REJECTED', 0, NULL),

-- Suresh — Gond
(5, 2, 'Gond Peacock Tree', 'gond-peacock-tree',
 'A vibrant A3-size Gond painting of a sacred Peacock perched in a blossoming tree, rendered in Suresh\'s signature dotted technique with natural and acrylic pigments.',
 'Dotted line work with natural pigments', 'Natural pigments, acrylic, fine brush on paper', 1600.00, 18, 'APPROVED', 1,
 'For the Gond people of Madhya Pradesh, a keen eye on nature is believed to bring good fortune. The peacock is Saraswati\'s vehicle and a rain-harbinger; painting it in full display is an act of thanksgiving after the monsoon. The characteristic dot-and-dash infill technique used by Suresh comes from the Pardhan tradition of song-paintings (Jangarh Singh Shyam is the most celebrated practitioner), where each animal is filled with the patterns found on its skin or feathers.'),

(5, 2, 'Gond River Goddess', 'gond-river-goddess',
 'An A2 Gond painting of Narmada Devi emerging from the sacred river, surrounded by crocodiles, fish, and lotus blooms. A museum-quality piece in fine-line Gond style.',
 'Fine-line Gond technique', 'Acrylic and natural pigments on archival paper', 3200.00, 6, 'APPROVED', 0,
 'The Narmada river is considered the mother of all rivers in Gondi cosmology. The river goddess is depicted as emerging from the water at dawn, blessing the surrounding landscape. The painting technique uses extremely fine brushwork to create dense patterns — a technique called "Jangarh Kalam" (Jangarh\'s pen) after its most famous exponent.'),

-- Kamla — Lambani
(6, 3, 'Lambani Embroidered Blouse', 'lambani-embroidered-blouse',
 'A hand-embroidered Lambani blouse (choli) in deep indigo cotton adorned with geometric patchwork, mirrors, and Banjara threadwork. Sizes S/M/L available; specify in order notes.',
 'Lambani patchwork embroidery with mirrors', 'Cotton fabric, mirrors, coloured threads, sequins', 2200.00, 10, 'APPROVED', 0,
 'Lambani (Banjara) embroidery is among India\'s most opulent needlework traditions, combining patchwork (called "tippri"), mirror-work (sheesha), and dense geometric thread embroidery in a single garment. Historically, Banjara women wore these elaborately decorated garments as walking dowries — the embroidery encoded family identity, community status, and spiritual protection. A single garment can take two to three months to complete.'),

(6, 3, 'Lambani Wall Hanging — Tribal Seasons', 'lambani-wall-hanging',
 'A large (60×90 cm) Lambani wall hanging depicting the four seasons through symbolic tribal motifs: rain drops, harvest sheaves, winter stars, and spring blossoms — all in Banjara patchwork and mirror-work.',
 'Banjara patchwork and mirror embroidery', 'Cotton, mirrors, silk threads, natural dyes', 4800.00, 4, 'APPROVED', 0,
 'The Lambani or Banjara community were nomadic salt and grain traders across the Deccan plateau for centuries. Their embroidery documented their journeys and the landscapes they traversed. The four-seasons motif seen in this piece is a recent innovation by Kamla, synthesising traditional Banjara symbols into a new narrative structure that urban collectors can read as art history.'),

(6, 3, 'Banjara Clutch Purse', 'banjara-clutch-purse',
 'A compact (25×15 cm) evening clutch in the Lambani patchwork style, with a zip closure and embroidered front panel. Interior cotton lining. A wearable piece of heritage.',
 'Lambani patchwork embroidery', 'Cotton, mirrors, coloured threads, zip', 1100.00, 25, 'APPROVED', 0,
 'Kamla began making functional accessories in the Lambani tradition to create sustainable income for her self-help group of twelve women in Sandur, Vijayanagara district. The clutch form adapts traditional embroidery panels — historically used on wedding robes — into a contemporary product while preserving the full decorative vocabulary of Banjara needlework.'),

-- Pending / Draft
(5, 2, 'Gond Sacred Grove', 'gond-sacred-grove',
 'An A3 painting of a Dev-Van (sacred grove) — the forest preserve maintained by Gond villages for their deity — showing birds, animals, and the central Saj tree.',
 'Gond fine-line technique', 'Natural pigments on archival paper', 2000.00, 10, 'PENDING_REVIEW', 0, NULL),

(3, 1, 'Dhokra Tribal Lamp', 'dhokra-tribal-lamp',
 'A functional brass oil lamp (diya) with Dhokra tribal motif base. Can hold a tealight or traditional wick.',
 'Lost-wax casting', 'Brass alloy', 1800.00, 0, 'DRAFT', 0, NULL);

-- ================================================================
-- PRODUCT IMAGES (placeholder paths — served as CSS colour blocks)
-- ================================================================
INSERT INTO product_images (product_id, image_path, is_primary) VALUES
(1, '/uploads/seed/dhokra-bull-1.jpg', 1),
(1, '/uploads/seed/dhokra-bull-2.jpg', 0),
(2, '/uploads/seed/dhokra-ganesha-1.jpg', 1),
(3, '/uploads/seed/dhokra-mask-1.jpg', 1),
(4, '/uploads/seed/dhokra-elephant-1.jpg', 1),
(5, '/uploads/seed/warli-wedding-1.jpg', 1),
(5, '/uploads/seed/warli-wedding-2.jpg', 0),
(6, '/uploads/seed/warli-forest-1.jpg', 1),
(7, '/uploads/seed/warli-harvest-1.jpg', 1),
(8, '/uploads/seed/warli-village-1.jpg', 1),
(9, '/uploads/seed/gond-peacock-1.jpg', 1),
(9, '/uploads/seed/gond-peacock-2.jpg', 0),
(10, '/uploads/seed/gond-river-1.jpg', 1),
(11, '/uploads/seed/lambani-blouse-1.jpg', 1),
(12, '/uploads/seed/lambani-wall-1.jpg', 1),
(13, '/uploads/seed/lambani-clutch-1.jpg', 1),
(14, '/uploads/seed/gond-grove-1.jpg', 1),
(15, '/uploads/seed/dhokra-lamp-1.jpg', 1);

-- ================================================================
-- COUPONS
-- ================================================================
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_to, created_by, artisan_id, is_active) VALUES
('TRIBALART10', 'Platform-wide 10% off on all tribal art', 'PERCENT', 10, 500, 500, '2026-01-01', '2026-12-31', 1, NULL, 1),
('DHOKRA200',   'Flat ₹200 off on Ramesh\'s Dhokra pieces', 'FLAT', 200, 2000, 50, '2026-01-01', '2026-12-31', 3, 3, 1);

-- ================================================================
-- ORDERS (customer_ids: Ananya=7, Vikram=8, Business=9)
-- ================================================================
INSERT INTO orders (order_number, customer_id, subtotal, discount_amount, total, coupon_id, status, ship_name, ship_phone, ship_address, ship_city, ship_state, ship_pincode) VALUES
('KS-20260101-0001', 7, 4600.00, 0, 4600.00, NULL, 'DELIVERED', 'Ananya Mehta', '9000000007', '12 Sunshine Apartments, Bandra West', 'Mumbai', 'Maharashtra', '400050'),
('KS-20260205-0002', 8, 2800.00, 280.00, 2520.00, 1, 'SHIPPED', 'Vikram Joshi', '9000000008', '45 Green Park Extension', 'New Delhi', 'Delhi', '110016'),
('KS-20260310-0003', 7, 5200.00, 0, 5200.00, NULL, 'CONFIRMED', 'Ananya Mehta', '9000000007', '12 Sunshine Apartments, Bandra West', 'Mumbai', 'Maharashtra', '400050'),
('KS-20260401-0004', 9, 4800.00, 480.00, 4320.00, 1, 'PLACED', 'Terra Decor Imports', '9000000009', '88 Export Zone, Whitefield', 'Bengaluru', 'Karnataka', '560066'),
('KS-20260501-0005', 8, 1600.00, 0, 1600.00, NULL, 'CANCELLED', 'Vikram Joshi', '9000000008', '45 Green Park Extension', 'New Delhi', 'Delhi', '110016');

INSERT INTO order_items (order_id, product_id, artisan_id, quantity, unit_price) VALUES
(1, 5, 4, 1, 1800.00),  -- Warli Wedding Dance
(1, 9, 5, 1, 1600.00),  -- Gond Peacock
(1, 13, 6, 1, 1200.00), -- Banjara Clutch
(2, 1, 3, 1, 2800.00),  -- Dhokra Bull
(3, 3, 3, 1, 4200.00),  -- Dhokra Mask (qty 1, price snapshot)
(3, 11, 6, 1, 1000.00), -- Lambani Blouse (price snapshot)
(4, 12, 6, 1, 4800.00), -- Lambani Wall Hanging
(5, 9, 5, 1, 1600.00);  -- Gond Peacock (cancelled)

INSERT INTO payments (order_id, amount, method, status, transaction_ref, paid_at) VALUES
(1, 4600.00, 'MOCK_CARD', 'SUCCESS', 'MOCK-TXN-ABC12345', '2026-01-01 14:30:00'),
(2, 2520.00, 'MOCK_UPI', 'SUCCESS', 'MOCK-TXN-DEF67890', '2026-02-05 10:15:00'),
(3, 5200.00, 'MOCK_CARD', 'SUCCESS', 'MOCK-TXN-GHI11223', '2026-03-10 16:45:00'),
(4, 4320.00, 'MOCK_UPI', 'PENDING', NULL, NULL),
(5, 1600.00, 'MOCK_CARD', 'FAILED', 'MOCK-TXN-JKL99887', '2026-05-01 09:00:00');

-- ================================================================
-- REVIEWS (only for DELIVERED orders — order 1)
-- ================================================================
INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES
(5, 7, 5, 'Absolutely breathtaking. The rice-paste texture gives it such an authentic feel. Lalita''s work is museum-quality.'),
(9, 7, 5, 'Suresh''s peacock is a masterpiece. The dot work is incredibly precise. Fast delivery, careful packaging.'),
(13, 7, 4, 'Beautiful craftsmanship. The mirrors and threadwork are stunning. Only minor quibble: one mirror came slightly loose.'),
(1, 8, 5, 'The Dhokra bull is extraordinary — heavy, beautiful, and carries real artistic weight. Worth every rupee.'),
(6, 7, 5, 'The forest spirit painting is hauntingly beautiful. I''ve hung it in my studio and get compliments every day.'),
(7, 8, 4, 'Lovely set of four cards. Slightly smaller than expected but the quality of the rice-paste work is superb.');

-- ================================================================
-- BULK INQUIRY + QUOTE
-- ================================================================
INSERT INTO bulk_inquiries (business_user_id, product_id, quantity, target_price, message, status) VALUES
(9, 12, 50, 3500.00, 'We are a home décor import company based in Bengaluru. We would like to source 50 units of the Lambani Wall Hanging for the European market. Our target price is ₹3,500/unit for bulk. Please advise on lead time and packaging options.', 'QUOTED');

INSERT INTO inquiry_quotes (inquiry_id, artisan_id, quoted_unit_price, lead_time_days, notes) VALUES
(1, 6, 3800.00, 45, 'Thank you for your interest. I can supply 50 pieces at ₹3,800 per unit with a 45-day lead time. Each piece will be individually wrapped in acid-free tissue. I can customise the colour palette for Western markets on orders of 20+ units.');

-- ================================================================
-- SUPPORT TICKETS
-- ================================================================
INSERT INTO support_tickets (raised_by, order_id, subject, description, status) VALUES
(7, 1, 'Request for gift wrapping on future orders', 'I would love if KalaSetu offered gift wrapping with a handwritten card option. I buy frequently for corporate gifting and this would be a great feature.', 'OPEN'),
(8, 2, 'Order shipped but tracking not updating', 'My order KS-20260205-0002 shows as SHIPPED but the tracking has not updated in 5 days. Can you please check with the artisan?', 'IN_PROGRESS');

-- ================================================================
-- CONVERSATIONS + MESSAGES
-- ================================================================
INSERT INTO conversations (customer_id, artisan_id, product_id) VALUES
(7, 4, 5);  -- Ananya talks to Lalita about the Warli painting

INSERT INTO messages (conversation_id, sender_id, body) VALUES
(1, 7, 'Hello Lalita! I just received your Warli Wedding Dance painting and it is absolutely stunning. I have a question — would you be able to create a custom commission in a similar style but showing a harvest festival scene? I would need it on a larger canvas (80×60 cm).'),
(1, 4, 'Namaste Ananya! I am so glad you love it. Yes, I would be very happy to do a custom harvest festival painting on 80×60 cm canvas. The harvest scene with the Tarpa dance and grain goddess is one of my favourites. It would take about 3 weeks and I would price it at ₹3,200. Shall I proceed?'),
(1, 7, 'That sounds wonderful! Please go ahead. I will also look out for more of your pieces in the shop.');

-- ================================================================
-- NOTIFICATIONS
-- ================================================================
INSERT INTO notifications (user_id, type, title, body, link, is_read) VALUES
(7, 'ORDER_UPDATE', 'Order delivered!', 'Your order KS-20260101-0001 has been delivered.', '/order.html?id=1', 1),
(8, 'ORDER_UPDATE', 'Order shipped', 'Your order KS-20260205-0002 is on its way.', '/order.html?id=2', 0),
(3, 'ORDER_UPDATE', 'New order received', 'Ananya Mehta placed an order for Dhokra Bull Figurine.', '/artisan/orders.html', 1),
(9, 'NEW_QUOTE', 'Quote received', 'Kamla Pardhiyan quoted ₹3,800/unit on your bulk inquiry.', '/inquiries.html', 0);

-- ================================================================
-- VERIFICATION REVIEWS (for the approved products)
-- ================================================================
INSERT INTO verification_reviews (product_id, consultant_id, decision, feedback) VALUES
(1, 2, 'APPROVED', 'Excellent piece with authentic Dhokra technique. Cultural notes added.'),
(2, 2, 'APPROVED', 'Verified as genuine Dhokra work from Kondagaon, Bastar.'),
(3, 2, 'APPROVED', 'Authentic tribal mask with proper cultural context.'),
(5, 2, 'APPROVED', 'Beautiful Warli painting — rice-paste technique verified as authentic.'),
(6, 2, 'APPROVED', 'Authentic Warli forest spirit painting.'),
(7, 2, 'APPROVED', 'Quality Warli harvest series. Rice-paste on natural paper verified.'),
(8, 2, 'REJECTED', 'The canvas medium is not traditional for Warli painting. Please resubmit with proper handmade paper and authentic rice-paste medium, not acrylic.'),
(9, 2, 'APPROVED', 'Vibrant Gond work using authentic dotted technique.'),
(10, 2, 'APPROVED', 'Fine-line Gond style verified — Jangarh Kalam tradition.'),
(11, 2, 'APPROVED', 'Authentic Lambani patchwork embroidery with traditional mirror work.'),
(12, 2, 'APPROVED', 'Exceptional Banjara needlework. Cultural notes document trade routes.'),
(13, 2, 'APPROVED', 'Functional Lambani accessory maintaining full traditional embroidery vocabulary.');

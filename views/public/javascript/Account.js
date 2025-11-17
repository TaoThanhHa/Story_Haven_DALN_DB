// Account.js
document.addEventListener("DOMContentLoaded", function () {
    const profileFullName = document.getElementById("profileFullName");
    const profileUsername = document.getElementById("profileUsername");
    const storyNameElement = document.getElementById("storyName");
    const storyCountElement = document.getElementById("storyCount");

    // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY ===

    // Các phần tử hiển thị số lượng theo dõi ở phần header profile (Đã có)
    const followersCountDisplay = document.getElementById("followersCountDisplay");
    const followingCountDisplay = document.getElementById("followingCountDisplay");

    // THÊM: Các phần tử làm trigger click để chuyển hướng đến trang social (Cần thêm ID vào EJS)
    // Giả định rằng bạn đã thêm id="followersCountClickable" và id="followingCountClickable"
    // vào các thẻ span chứa số đếm trong phần profile__stats của Account.ejs
    const followersCountClickable = document.getElementById("followersCountClickable");
    const followingCountClickable = document.getElementById("followingCountClickable");

    // THÊM: Các phần tử hiển thị số lượng theo dõi trong các card "Giới thiệu"
    // Giả định bạn đã thêm id="followersCountInCard" và id="followingCountInCard"
    // vào các thẻ span.badge trong card "Đang theo dõi" và "Người theo dõi" của Account.ejs
    const followersCountInCard = document.getElementById("followersCountInCard");
    const followingCountInCard = document.getElementById("followingCountInCard");

    // Các phần tử để hiển thị danh sách người theo dõi/đang theo dõi (Đã có)
    const followingUsersList = document.getElementById('followingUsersList');
    const noFollowingMessage = document.getElementById('noFollowingMessage');
    const followersUsersList = document.getElementById('followersUsersList');
    const noFollowersMessage = document.getElementById('noFollowersMessage');

    // THÊM: Các phần tử làm trigger click cho toàn bộ tiêu đề card
    const cardFollowersHeaderClickable = document.getElementById("cardFollowersHeaderClickable");
    const cardFollowingHeaderClickable = document.getElementById("cardFollowingHeaderClickable");

    // === KẾT THÚC CÁC THAY ĐỔI ĐỊNH NGHĨA PHẦN TỬ ===


    const workList = document.getElementById("workList");
    const publishedStoriesElement = document.getElementById("publishedStories");
    const draftStoriesElement = document.getElementById("draftStories");
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const commentsList = document.getElementById('comments');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.content__section');
    const editProfileForm = document.getElementById('editProfileForm');
    const settingsSection = document.getElementById('caidat'); // Lấy section cài đặt

    const profileMainAvatar = document.getElementById('profileMainAvatar'); // Avatar lớn ở đầu trang
    const navbarAvatarImg = document.getElementById('navbarAvatarImg'); // Avatar nhỏ trên navbar (đã sửa ID ở header.ejs)
    const avatarFileInput = document.getElementById('avatarFile'); // Input type="file"
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarUrlInput = document.getElementById('avatarUrl');
    const descriptionTextarea = document.getElementById('description');
    const profileDescriptionContent = document.getElementById('profileDescriptionContent');

    // Các phần tử mới cho tính năng follow
    const followButton = document.getElementById('followButton');
    const settingsTab = document.getElementById('settingsTab');
    // followingListCard và followersListCard không cần khai báo ở đây nếu chỉ cập nhật nội dung bên trong

    let currentProfileUserId = null; // ID của người dùng mà chúng ta đang xem profile
    let loggedInUserId = LOGGED_IN_USER_ID;
    loggedInUserId = loggedInUserId === '' ? null : loggedInUserId; // Chuyển chuỗi rỗng thành null
    

    // Hàm để hiển thị preview ảnh
    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                // Nếu không có file được chọn, đặt lại ảnh mặc định hoặc ảnh cũ
                avatarPreview.src = profileMainAvatar.src; // Hoặc một default-avatar.png
            }
        });
    }

    // Hàm lấy ID người dùng từ URL (nếu có)
    const getUserIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'account') {
            return pathParts[2];
        }
        return null;
    };

    // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY (Gắn Event Listeners) ===

    /*
    // Event listener để chuyển hướng khi click vào số lượng người theo dõi ở HEADER PROFILE
    if (followersCountClickable) {
        followersCountClickable.style.cursor = 'pointer'; // Thêm con trỏ để người dùng biết có thể click
        followersCountClickable.addEventListener('click', () => {
            if (currentProfileUserId) {
                window.location.href = `/account/${currentProfileUserId}/social?tab=followers`;
            }
        });
    }

    // Event listener để chuyển hướng khi click vào số lượng người đang theo dõi ở HEADER PROFILE
    if (followingCountClickable) {
        followingCountClickable.style.cursor = 'pointer'; // Thêm con trỏ
        followingCountClickable.addEventListener('click', () => {
            if (currentProfileUserId) {
                window.location.href = `/account/${currentProfileUserId}/social?tab=following`;
            }
        });
    }
        */

    // Event listener để chuyển hướng khi click vào tiêu đề card "Người theo dõi"
    if (cardFollowersHeaderClickable) {
        cardFollowersHeaderClickable.style.cursor = 'pointer';
        cardFollowersHeaderClickable.addEventListener('click', () => {
            if (currentProfileUserId) {
                window.location.href = `/account/${currentProfileUserId}/social?tab=followers`;
            }
        });
    }

    // Event listener để chuyển hướng khi click vào tiêu đề card "Đang theo dõi"
    if (cardFollowingHeaderClickable) {
        cardFollowingHeaderClickable.style.cursor = 'pointer';
        cardFollowingHeaderClickable.addEventListener('click', () => {
            if (currentProfileUserId) {
                window.location.href = `/account/${currentProfileUserId}/social?tab=following`;
            }
        });
    }

    // === KẾT THÚC CÁC THAY ĐỔI GẮN EVENT LISTENERS ===


    // Hàm fetch stories (cần chỉnh sửa để lấy stories của userId cụ thể)
    const fetchStories = async (userId) => {
        try {
            // Nếu userId được truyền → lấy stories của user đó, không cần auth
            const url = userId ? `/api/user/${userId}/stories` : '/api/storiesbyuser';
            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) {
                throw new Error("Không thể lấy danh sách truyện");
            }
            const stories = await response.json();

            let publishedCount = 0;
            let draftCount = 0;

            stories.forEach(story => {
                if (story.status === 'published') {
                    publishedCount++;
                } else {
                    draftCount++;
                }
            });

            publishedStoriesElement.textContent = publishedCount;
            draftStoriesElement.textContent = draftCount;
            storyCountElement.textContent = stories.length;

            workList.innerHTML = '';
            if (stories.length === 0) {
                workList.innerHTML = '<p class="text-muted text-center mt-3">Chưa có truyện nào.</p>';
                return;
            }

            stories.forEach(story => {
                const workItem = document.createElement('div');
                workItem.classList.add('work-item');
                workItem.innerHTML = `
                    <a href="/story/${story._id}" class="story-thumbnail-link">
                        <img src="${story.thumbnail ? story.thumbnail : '/images/default-thumbnail.png'}" alt="${story.title}">
                    </a>
                    <div class="work-info">
                        <a href="/story/${story._id}" class="story-title-link">
                            <h4>${story.title}</h4>
                        </a>
                        <p><i class="fas fa-eye"></i> 0 <i class="fas fa-star"></i> 0 <i class="fas fa-list"></i> 0</p>
                        <p class="work-summary">${story.description ? story.description.substring(0, 50) + '...' : 'No description'}</p>
                        <p class="text-muted">${story.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</p>
                    </div>
                `;
                workList.appendChild(workItem);
            });
        } catch (error) {
            console.error('Error fetching stories:', error);
            workList.innerHTML = '<p class="text-danger text-center mt-3">Lỗi khi tải truyện.</p>';
        }
    };

    // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY (Uncomment và chỉnh sửa hàm fetch danh sách) ===

    // Hàm fetch và hiển thị danh sách người đang theo dõi
    const fetchFollowingUsers = async (userId) => {
        try {
            const response = await fetch(`/api/user/${userId}/following`);
            const data = await response.json();
            if (data.success && data.following) {
                followingUsersList.innerHTML = '';
                if (data.following.length === 0) {
                    noFollowingMessage.style.display = 'block';
                } else {
                    noFollowingMessage.style.display = 'none';
                    data.following.forEach(user => {
                        const userItem = document.createElement('a');
                        userItem.href = `/account/${user._id}`;
                        userItem.classList.add('following-item');
                        // THÊM: hiển thị username cùng với avatar
                        userItem.innerHTML = `<img src="${user.avatar || '/images/default-avatar.png'}" alt="Avatar ${user.username}"><span>${user.username}</span>`;
                        followingUsersList.appendChild(userItem);
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching following users:', error);
            noFollowingMessage.style.display = 'block';
            noFollowingMessage.textContent = 'Lỗi khi tải danh sách.';
        }
    };

    // Hàm fetch và hiển thị danh sách người theo dõi mình
    const fetchFollowersUsers = async (userId) => {
        try {
            const response = await fetch(`/api/user/${userId}/followers`);
            const data = await response.json();
            if (data.success && data.followers) {
                followersUsersList.innerHTML = '';
                if (data.followers.length === 0) {
                    noFollowersMessage.style.display = 'block';
                } else {
                    noFollowersMessage.style.display = 'none';
                    data.followers.forEach(user => {
                        const userItem = document.createElement('a');
                        userItem.href = `/account/${user._id}`;
                        userItem.classList.add('following-item');
                        // THÊM: hiển thị username cùng với avatar
                        userItem.innerHTML = `<img src="${user.avatar || '/images/default-avatar.png'}" alt="Avatar ${user.username}"><span>${user.username}</span>`;
                        followersUsersList.appendChild(userItem);
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching followers users:', error);
            noFollowersMessage.style.display = 'block';
            noFollowersMessage.textContent = 'Lỗi khi tải danh sách.';
        }
    };
    // === KẾT THÚC CÁC THAY ĐỔI TRONG HÀM FETCH DANH SÁCH ===


    async function loadProfile() {
        try {
            const pathParts = window.location.pathname.split("/");
            const userIdInUrl = pathParts[1] === "account" ? pathParts[2] : null;

            // Ẩn/hiện tab Cài đặt khi người dùng truy cập đúng profile
            // Ẩn / hiện tab Cài đặt
            if (loggedInUserId && loggedInUserId === (userIdInUrl || loggedInUserId)) {
                settingsTab.style.display = "inline-block";
            } else {
                settingsTab.style.display = "none";
            }


            // ✅ API tương ứng
            const url = userIdInUrl ? `/api/account/${userIdInUrl}` : `/api/user/account-info`;

            const res = await fetch(url, { credentials: "include" });

            if (!res.ok) {
                console.warn("Không thể load profile:", res.status);
                return;
            }

            const data = await res.json();
            const user = data.user || data;

            if (!user) {
                console.error("Lỗi: Không có dữ liệu user");
                return;
            }

            // ✅ Gán ID đang xem profile
            currentProfileUserId = user._id;
            

            // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY (Cập nhật số đếm và gọi fetch list) ===

            // KHÔNG GHI ĐÈ followingListCard.innerHTML VÀ followersListCard.innerHTML
            // mà chỉ cập nhật textContent của các span chứa số đếm.

            // Cập nhật số lượng người theo dõi ở HEADER PROFILE
            if (followersCountDisplay) followersCountDisplay.textContent = data.followersCount || user.followers?.length || 0;
            if (followingCountDisplay) followingCountDisplay.textContent = data.followingCount || user.following?.length || 0;

            // Cập nhật số lượng người theo dõi trong các CARD "GIỚI THIỆU"
            if (followersCountInCard) followersCountInCard.textContent = data.followersCount || user.followers?.length || 0;
            if (followingCountInCard) followingCountInCard.textContent = data.followingCount || user.following?.length || 0;

            // === KẾT THÚC CÁC THAY ĐỔI CẬP NHẬT SỐ ĐẾM ===


            // ==== GÁN DỮ LIỆU VÀO GIAO DIỆN CƠ BẢN ====
            profileFullName.textContent = user.username || "Người dùng";
            profileUsername.textContent = user.username || "username";
            storyNameElement.textContent = user.username || "username";
            // followersCountDisplay và followingCountDisplay đã được cập nhật ở trên
            profileDescriptionContent.textContent = user.description || "Chưa có mô tả";

            // Avatar
            if (user.avatar) {
                profileMainAvatar.src = user.avatar;
                navbarAvatarImg.src = user.avatar;
                avatarPreview.src = user.avatar;
            }

            // Hiển thị follow nếu xem user khác
            if (userIdInUrl && loggedInUserId && loggedInUserId !== user._id) {
                followButton.style.display = "inline-block";
                followButton.textContent = data.isFollowing ? "Đã theo dõi" : "Theo dõi";
                followButton.classList.toggle("btn-success", data.isFollowing);
                followButton.classList.toggle("btn-primary", !data.isFollowing);
            } else {
                followButton.style.display = "none";
            }

            // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY (Gọi fetch danh sách) ===
            // Load danh sách follow/followers
            fetchFollowingUsers(user._id);
            fetchFollowersUsers(user._id);
            // === KẾT THÚC CÁC THAY ĐỔI GỌI FETCH DANH SÁCH ===


            // Load truyện của user
            fetchStories(user._id);

        } catch (err) {
            console.error("Lỗi loadProfile:", err);
        }
    }


    // Gọi hàm loadProfile khi trang được tải
    loadProfile();

    followButton.addEventListener('click', async () => {
        if (!loggedInUserId) {
            alert('Bạn cần đăng nhập để theo dõi người khác.');
            window.location.href = '/login';
            return;
        }

        if (currentProfileUserId === loggedInUserId) return;

        try {
            const response = await fetch(`/api/user/${currentProfileUserId}/follow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Lỗi follow.');
                return;
            }

            // Cập nhật nút follow
            followButton.textContent = data.followed ? "Đã theo dõi" : "Theo dõi";
            followButton.classList.toggle('btn-success', data.followed);
            followButton.classList.toggle('btn-primary', !data.followed);

            // === CÁC THAY ĐỔI BẮT ĐẦU TẠI ĐÂY (Cập nhật số đếm sau follow) ===
            // Cập nhật số followers NGAY LẬP TỨC (trên cả header và card)
            let currentFollowers = parseInt(followersCountDisplay.textContent);

            if (data.followed) currentFollowers++;
            else currentFollowers--;

            followersCountDisplay.textContent = currentFollowers;
            if (followersCountInCard) followersCountInCard.textContent = currentFollowers; // Cập nhật cả trong card

            // Cập nhật lại danh sách followers trong card
            fetchFollowersUsers(currentProfileUserId);
            // === KẾT THÚC CÁC THAY ĐỔI CẬP NHẬT SỐ ĐẾM SAU FOLLOW ===

        } catch (error) {
            console.error('Lỗi follow:', error);
        }
    });


    // Mảng tên người dùng và avatar mẫu (dùng cho bình luận) - Giữ nguyên
    const usernames = ["Alice", "Bob", "Charlie", "David", "Eve", "Schwi", "Shiro", "Izuna"];
    const avatars = ["/images/avt1.jpg", "/images/avt2.jpg", "/images/avt3.jpg", "/images/schwi.png", "/images/nền.jpg", "/images/avt10.jpg"];


    // Hàm tạo ID ngẫu nhiên
    function generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Hàm lấy tên người dùng ngẫu nhiên
    function getRandomUsername() {
        return usernames[Math.floor(Math.random() * usernames.length)];
    }

    // Hàm lấy avatar ngẫu nhiên
    function getRandomAvatar() {
        return avatars[Math.floor(Math.random() * avatars.length)];
    }

    // Hàm tạo phần tử bình luận (đã điều chỉnh để phù hợp CSS mới)
    function createCommentElement(commentText, username, avatar, date) {
        const commentId = generateId(); // Vẫn dùng ID ngẫu nhiên cho demo
        const comment = document.createElement("li");
        comment.classList.add("comment-item"); // Thay đổi class
        comment.dataset.commentId = commentId;
        comment.innerHTML = `
            <a href="#" class="avt">
                <img src="${avatar || getRandomAvatar()}" alt="Avatar">
            </a>
            <div class="comments-detail">
                <a href="#" class="nick-name">${username || getRandomUsername()}</a>
                <p class="comments-info">${commentText}</p>
                <div class="comments-item-meta">
                    <span class="comment-date">${date || new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="reply-btn"><i class="fas fa-reply"></i> Phản hồi (<span class="reply-count">0</span>)</div>
                        <div class="delete-btn" style="color: red; cursor: pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
                <div class="replies" id="replies-for-${commentId}"></div>
                <form class="reply-form" style="display: none;" data-comment-id="${commentId}">
                    <textarea placeholder="Nhập phản hồi của bạn..." required></textarea>
                    <button type="submit"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        `;

        const replyBtn = comment.querySelector(".reply-btn");
        const replyCount = comment.querySelector(".reply-count");
        const repliesContainer = comment.querySelector(".replies");
        const replyForm = comment.querySelector(".reply-form");
        const replyInput = replyForm.querySelector("textarea"); // Sửa selector
        const deleteBtn = comment.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", function () {
            if (confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
                comment.remove();
            }
        });

        replyBtn.addEventListener("click", function () {
            replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none"; // Hiện/ẩn form reply, dùng flex
            if (replyForm.style.display === "flex") {
                replyInput.focus();
            }
        });

        replyForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const replyText = replyInput.value.trim();
            if (replyText === "") return;

            const currentUserName = profileFullName.textContent || getRandomUsername();
            const currentUserAvatar = profileMainAvatar.src || getRandomAvatar();

            const replyElement = createReplyElement(replyText, currentUserName, currentUserAvatar, new Date().toLocaleString());
            repliesContainer.appendChild(replyElement);
            replyForm.style.display = "none";
            replyCount.textContent = parseInt(replyCount.textContent) + 1;
            repliesContainer.style.display = "block"; // Đảm bảo container replies hiện ra
            replyInput.value = "";
        });
        return comment;
    }

    // Hàm tạo phần tử phản hồi bình luận (đã điều chỉnh để phù hợp CSS mới)
    function createReplyElement(replyText, username, avatar, date) {
        const reply = document.createElement("div");
        reply.classList.add("reply"); // Sử dụng class 'reply'
        reply.innerHTML = `
            <a href="#" class="avt">
                <img src="${avatar || getRandomAvatar()}" alt="Avatar">
            </a>
            <div class="comments-detail">
                <a href="#" class="nick-name">${username || getRandomUsername()}</a>
                <p class="comments-info">${replyText}</p>
                <div class="comments-item-meta">
                    <span class="comment-date">${date || new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="delete-btn" style="color: red; cursor: pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
            </div>
        `;
        const deleteBtn = reply.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", function () {
            if (confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
                reply.remove();
            }
        });

        return reply;
    }

    // Xử lý gửi bình luận
    commentForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const commentText = commentInput.value.trim();
        if (commentText === "") return;

        const currentUserName = profileFullName.textContent || getRandomUsername();
        const currentUserAvatar = profileMainAvatar.src || getRandomAvatar();

        const commentElement = createCommentElement(commentText, currentUserName, currentUserAvatar, new Date().toLocaleString());
        commentsList.prepend(commentElement); // Thêm comment mới lên đầu
        commentInput.value = "";
        commentInput.style.height = 'auto'; // Reset chiều cao textarea sau khi gửi
    });

    // Tự động điều chỉnh chiều cao textarea bình luận chính
    commentInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    // Tự động điều chỉnh chiều cao cho tất cả textarea phản hồi
    document.addEventListener('input', function(event) {
        if (event.target.matches('.reply-form textarea')) {
            event.target.style.height = 'auto';
            event.target.style.height = (event.target.scrollHeight) + 'px';
        }
    });

    // Xử lý chuyển đổi tab
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('tab--active'));
            sections.forEach(s => s.classList.remove('content__section--active'));
            tab.classList.add('tab--active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('content__section--active');
        });
    });

    // Kích hoạt tab đầu tiên ('gioithieu') khi tải trang
    // Đảm bảo tab 'gioithieu' và section tương ứng được kích hoạt ban đầu
    const firstTab = document.querySelector('.tab[data-tab="gioithieu"]');
    if (firstTab) {
        firstTab.click(); // Giả lập click để kích hoạt tab và section
    }

    // Xử lý gửi form chỉnh sửa thông tin cá nhân
    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const description = descriptionTextarea.value;

        const formData = new FormData(); // Tạo FormData
        formData.append('username', name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('description', description);

        const avatarFile = document.getElementById('avatarFile').files[0];
        if (avatarFile) {
            formData.append('avatarFile', avatarFile); // Thêm file vào FormData
        } else {
            const currentAvatarSrc = profileMainAvatar.src;
            if (!currentAvatarSrc.includes('schwi.png') && !currentAvatarSrc.includes('default-avatar.png')) {
                const url = new URL(currentAvatarSrc);
                formData.append('avatar', url.pathname);
            } else {
                formData.append('avatar', '/images/schwi.png'); // Hoặc '/images/default-avatar.png'
            }
        }


        try {
            const response = await fetch('/api/user/update-profile', {
                method: 'PUT',
                body: formData
            });
            const data = await response.json();

            if (response.ok && data.success) {
                successMessage.textContent = data.message || "Cập nhật thông tin thành công!";
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';

                loadProfile(); // Tải lại profile để cập nhật avatar và thông tin mới

                setTimeout(() => {
                    successMessage.style.display = 'none';
                }, 3000);
            } else {
                errorMessage.textContent = data.error || 'Có lỗi xảy ra khi cập nhật thông tin.';
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
            }
        } catch (error) {
            console.error('Lỗi:', error);
            errorMessage.textContent = 'Có lỗi xảy ra trong quá trình cập nhật thông tin.';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        }
    });
});
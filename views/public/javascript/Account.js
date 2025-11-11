// Account.js
document.addEventListener("DOMContentLoaded", function () {
    const profileFullName = document.getElementById("profileFullName");
    const profileUsername = document.getElementById("profileUsername");
    const storyNameElement = document.getElementById("storyName");
    const storyCountElement = document.getElementById("storyCount");
    const followersCountDisplay = document.getElementById("followersCountDisplay"); // Mới
    const followingCountDisplay = document.getElementById("followingCountDisplay"); // Mới
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
    const avatarUrlInput = document.getElementById('avatarUrl');
    const descriptionTextarea = document.getElementById('description');
    const profileDescriptionContent = document.getElementById('profileDescriptionContent');

    // Các phần tử mới cho tính năng follow
    const followButton = document.getElementById('followButton');
    const settingsTab = document.getElementById('settingsTab');
    const followingListCard = document.getElementById('followingListCard');
    const followingUsersList = document.getElementById('followingUsersList');
    const noFollowingMessage = document.getElementById('noFollowingMessage');
    const followersListCard = document.getElementById('followersListCard');
    const followersUsersList = document.getElementById('followersUsersList');
    const noFollowersMessage = document.getElementById('noFollowersMessage');


    let currentProfileUserId = null; // ID của người dùng mà chúng ta đang xem profile
    let loggedInUserId = '<%= user ? user._id : "" %>'; // Lấy ID của user đang đăng nhập từ EJS
    loggedInUserId = loggedInUserId === '' ? null : loggedInUserId; // Chuyển chuỗi rỗng thành null

    // Hàm lấy ID người dùng từ URL (nếu có)
    const getUserIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'account') {
            return pathParts[2];
        }
        return null;
    };

    // Hàm fetch stories (cần chỉnh sửa để lấy stories của userId cụ thể)
    const fetchStories = async (userId) => {
        try {
            const url = userId ? `/api/storiesbyuser?userId=${userId}` : '/api/storiesbyuser';
            const response = await fetch(url);
            const stories = await response.json();

            let publishedCount = 0;
            let draftCount = 0;

            stories.forEach(story => {
                if (story.status === 'published') { // Sửa lại thành 'published' nếu đó là trạng thái đã xuất bản
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
                        <div class="work-tags">
                            <span class="badge bg-secondary">${story.category ? story.category : 'No category'}</span>
                        </div>
                        <p class="text-muted">${story.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</p> <!-- Đã sửa -->
                    </div>
                `;
                workList.appendChild(workItem);
            });
        } catch (error) {
            console.error('Error fetching stories:', error);
            workList.innerHTML = '<p class="text-danger text-center mt-3">Lỗi khi tải truyện.</p>';
        }
    };

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
                        userItem.innerHTML = `<img src="${user.avatar || '/images/default-avatar.png'}" alt="Avatar ${user.username}">`;
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
                        userItem.innerHTML = `<img src="${user.avatar || '/images/default-avatar.png'}" alt="Avatar ${user.username}">`;
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

    // Hàm chính để tải thông tin profile
    const loadProfile = async () => {
        const userIdInUrl = getUserIdFromUrl();
        currentProfileUserId = userIdInUrl || loggedInUserId;

        if (!currentProfileUserId) {
            console.error("Không tìm thấy ID người dùng để tải profile.");
            errorMessage.textContent = "Không tìm thấy thông tin tài khoản.";
            errorMessage.style.display = 'block';
            return;
        }

        try {
            const url = userIdInUrl ? `/api/user/${userIdInUrl}/profile` : `/api/user/account-info`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error("Lỗi:", data.error);
                errorMessage.textContent = data.error;
                errorMessage.style.display = 'block';
                return;
            }

            // Cập nhật thông tin cơ bản
            profileFullName.textContent = data.username; // Sử dụng fullname nếu có
            profileUsername.textContent = data.username;
            storyNameElement.textContent = data.username;

            followersCountDisplay.textContent = data.followersCount !== undefined ? data.followersCount : '0';
            followingCountDisplay.textContent = data.followingCount !== undefined ? data.followingCount : '0';

            // Cập nhật các trường form nếu là profile của mình
            if (!userIdInUrl || userIdInUrl === loggedInUserId) {
                document.getElementById("name").value = data.username;
                document.getElementById("email").value = data.email;
                document.getElementById("phone").value = data.phonenumber;
            }

            const avatarPath = data.avatar && data.avatar !== '' ? data.avatar : '/images/schwi.png';
            profileMainAvatar.src = avatarPath;
            if (navbarAvatarImg) {
                navbarAvatarImg.src = avatarPath;
            }
            avatarUrlInput.value = avatarPath;

            const userDescription = data.description && data.description !== '' ? data.description : 'Chưa có mô tả.';
            descriptionTextarea.value = userDescription === 'Chưa có mô tả.' ? '' : userDescription;
            profileDescriptionContent.textContent = userDescription;

            // Xử lý hiển thị nút follow và tab cài đặt
            if (userIdInUrl && userIdInUrl !== loggedInUserId) { // Đang xem profile người khác
                followButton.style.display = 'block';
                followButton.textContent = data.isFollowing ? 'Đã theo dõi' : 'Theo dõi';
                followButton.classList.toggle('btn-success', data.isFollowing);
                followButton.classList.toggle('btn-primary', !data.isFollowing);
                settingsTab.style.display = 'none'; // Ẩn tab cài đặt
                settingsSection.classList.remove('content__section--active'); // Đảm bảo section cài đặt bị ẩn
            } else { // Đang xem profile của mình
                followButton.style.display = 'none';
                settingsTab.style.display = 'block';
                // KHÔNG buộc settingsSection hiển thị ở đây. Logic chuyển tab sẽ xử lý nó.
            }

            fetchStories(currentProfileUserId);
            fetchFollowingUsers(currentProfileUserId);
            fetchFollowersUsers(currentProfileUserId);

        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu tài khoản:", error);
            errorMessage.textContent = "Không thể tải thông tin tài khoản.";
            errorMessage.style.display = 'block';
        }
    };

    // Gọi hàm loadProfile khi trang được tải
    loadProfile();

    // Xử lý sự kiện click nút Follow/Unfollow
    followButton.addEventListener('click', async () => {
        if (!loggedInUserId) {
            alert('Bạn cần đăng nhập để theo dõi người khác.');
            window.location.href = '/login';
            return;
        }
        if (currentProfileUserId === loggedInUserId) {
            return;
        }

        try {
            const response = await fetch(`/api/user/${currentProfileUserId}/follow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                followButton.textContent = data.followed ? 'Đã theo dõi' : 'Theo dõi';
                followButton.classList.toggle('btn-success', data.followed);
                followButton.classList.toggle('btn-primary', !data.followed);
                loadProfile(); // Tải lại để cập nhật số lượng followers
            } else {
                alert(data.error || 'Có lỗi xảy ra khi thực hiện hành động.');
            }
        } catch (error) {
            console.error('Lỗi khi follow/unfollow:', error);
            alert('Có lỗi xảy ra trong quá trình xử lý.');
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
        const avatarUrl = avatarUrlInput.value;
        const description = descriptionTextarea.value;

        const updateData = {
            username: name, // Nếu username được dùng làm tên hiển thị
            email: email,
            phone: phone,
            avatar: avatarUrl,
            description: description
        };

        try {
            const response = await fetch('/api/user/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                successMessage.textContent = data.message || "Cập nhật thông tin thành công!";
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';

                // Tải lại toàn bộ profile để đảm bảo mọi thứ được đồng bộ
                loadProfile();

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